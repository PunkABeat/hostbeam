//! Pure image operations for beaming: scale to a preview data URL and encode the
//! screenshot PNG. No Tauri, no clipboard — just pixels in, bytes out — so the
//! edge cases are unit-testable without a real clipboard or host.

use std::io::Cursor;
use std::path::{Path, PathBuf};

use base64::Engine as _;

use crate::error::{Error, Result};

/// A preview `data:` URL for an image already on disk, or None if it cannot be
/// read or decoded.
///
/// The `image` crate carries a decoder for every format with a pure-Rust one —
/// PNG, JPEG, GIF, WebP, BMP, TIFF — which is the same set `PULL_EXTENSIONS`
/// allows. HEIC, HEIF and AVIF are deliberately absent: decoding them means
/// libheif or dav1d, C libraries in the bundle for a 38x26 thumbnail. Those
/// still beam and still pull; their row just shows the placeholder.
///
/// Cosmetic either way, so every failure is a None rather than an error — a
/// file that will not decode must never cost someone their beam.
#[must_use]
pub fn preview_from_file(path: &Path, max: u32) -> Option<String> {
    let img = image::ImageReader::open(path)
        .ok()?
        .decode()
        .ok()?
        .into_rgba8();
    let (w, h) = img.dimensions();
    preview_data_url(w, h, img.as_raw(), max)
}

/// Downscale raw RGBA to a PNG `data:` URL (longest side ≤ `max`), preserving
/// aspect ratio. Returns None if the bytes don't form a valid image or encoding
/// fails. Never upscales beyond the source.
///
/// For a preview that gets **stored**, use [`preview_data_url`], which picks
/// whichever encoding is smaller for the picture in hand.
#[must_use]
pub fn scaled_png_data_url(w: u32, h: u32, rgba: &[u8], max: u32) -> Option<String> {
    Some(format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(png_bytes(w, h, rgba, max)?)
    ))
}

fn png_bytes(w: u32, h: u32, rgba: &[u8], max: u32) -> Option<Vec<u8>> {
    let thumb = scaled(w, h, rgba, max)?;
    let mut png = Vec::new();
    image::DynamicImage::ImageRgba8(thumb)
        .write_to(&mut Cursor::new(&mut png), image::ImageFormat::Png)
        .ok()?;
    Some(png)
}

/// As [`scaled_png_data_url`], but JPEG.
///
/// JPEG has no alpha, so the thumbnail is flattened onto white — a screenshot
/// has none, and a transparent PNG reads better on white than on black.
#[must_use]
pub fn scaled_jpeg_data_url(w: u32, h: u32, rgba: &[u8], max: u32) -> Option<String> {
    Some(format!(
        "data:image/jpeg;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(jpeg_bytes(w, h, rgba, max)?)
    ))
}

fn jpeg_bytes(w: u32, h: u32, rgba: &[u8], max: u32) -> Option<Vec<u8>> {
    let thumb = scaled(w, h, rgba, max)?;
    let (tw, th) = thumb.dimensions();
    let mut rgb = image::RgbImage::new(tw, th);
    for (x, y, px) in thumb.enumerate_pixels() {
        let a = f32::from(px[3]) / 255.0;
        let over = |c: u8| (f32::from(c) * a + 255.0 * (1.0 - a)).round() as u8;
        rgb.put_pixel(x, y, image::Rgb([over(px[0]), over(px[1]), over(px[2])]));
    }
    let mut jpeg = Vec::new();
    image::codecs::jpeg::JpegEncoder::new_with_quality(&mut Cursor::new(&mut jpeg), 78)
        .encode_image(&image::DynamicImage::ImageRgb8(rgb))
        .ok()?;
    Some(jpeg)
}

/// Whichever of PNG and JPEG comes out smaller, with its file extension. See
/// [`preview_data_url`] for why neither is picked in advance.
fn smaller_encoding(w: u32, h: u32, rgba: &[u8], max: u32) -> Option<(&'static str, Vec<u8>)> {
    let png = png_bytes(w, h, rgba, max);
    let jpeg = jpeg_bytes(w, h, rgba, max);
    match (png, jpeg) {
        (Some(p), Some(j)) => Some(if j.len() < p.len() {
            ("jpg", j)
        } else {
            ("png", p)
        }),
        (Some(p), None) => Some(("png", p)),
        (None, Some(j)) => Some(("jpg", j)),
        (None, None) => None,
    }
}

/// A preview for **storing** as a file: `dir/stem.png` or `dir/stem.jpg`,
/// whichever encodes smaller (the same choice [`preview_data_url`] makes, for
/// the same reasons). This is what a Recent row keeps now, in place of the
/// data URL that used to sit in the config (see `thumbs.rs`). `None` when the
/// pixels will not encode or the file cannot be written — a missing thumbnail,
/// never a failed beam.
#[must_use]
pub fn preview_file(
    dir: &Path,
    stem: &str,
    w: u32,
    h: u32,
    rgba: &[u8],
    max: u32,
) -> Option<PathBuf> {
    let (ext, bytes) = smaller_encoding(w, h, rgba, max)?;
    std::fs::create_dir_all(dir).ok()?;
    let path = dir.join(format!("{stem}.{ext}"));
    std::fs::write(&path, bytes).ok()?;
    Some(path)
}

/// As [`preview_file`], for an image already on disk (a dropped file).
#[must_use]
pub fn preview_file_from(src: &Path, dir: &Path, stem: &str, max: u32) -> Option<PathBuf> {
    let img = image::ImageReader::open(src)
        .ok()?
        .decode()
        .ok()?
        .into_rgba8();
    let (w, h) = img.dimensions();
    preview_file(dir, stem, w, h, img.as_raw(), max)
}

/// Pixels for a stored preview in whichever form the config holds it: a file
/// path (rows written since previews moved to the cache) or a data URL (rows
/// from before). `None` for anything this build cannot decode.
#[must_use]
pub fn rgba_from_thumb(thumb: &str, max: u32) -> Option<(u32, u32, Vec<u8>)> {
    if thumb.starts_with("data:") {
        return rgba_from_data_url(thumb, max);
    }
    rgba_from_bytes(&std::fs::read(thumb).ok()?, max)
}

/// A preview for **storing**: whichever of PNG and JPEG comes out smaller.
///
/// Neither wins outright, and the difference is large in both directions. A
/// screenshot is flat colour and hard edges, which is what PNG is for — one
/// measured at 6KB against JPEG's 26KB. A photograph or a noisy image is the
/// reverse: 922KB of PNG against 308KB of JPEG. Recent thumbnails are kept in
/// the config, which is mirrored into localStorage and its ~5MB quota, so the
/// wrong choice is not a rounding error — a list of noisy thumbnails once grew
/// a 9MB config, the mirror threw `QuotaExceededError`, and the window that
/// awaited it rendered nothing at all.
///
/// Encoding twice costs nothing at this size and removes the guess.
#[must_use]
pub fn preview_data_url(w: u32, h: u32, rgba: &[u8], max: u32) -> Option<String> {
    let png = scaled_png_data_url(w, h, rgba, max);
    let jpeg = scaled_jpeg_data_url(w, h, rgba, max);
    match (png, jpeg) {
        (Some(p), Some(j)) => Some(if j.len() < p.len() { j } else { p }),
        (p, j) => p.or(j),
    }
}

/// Shared resize: longest side ≤ `max`, aspect preserved, never upscaled.
///
/// Through `DynamicImage` rather than `imageops::resize` directly: the generic
/// function is compiled in whichever crate calls it, so called from here it
/// ran unoptimised in every dev build — most of a 7 s preview. The
/// `DynamicImage` method is compiled inside the image crate, which dev builds
/// optimise (Cargo.toml). Same filter, same pixels.
fn scaled(w: u32, h: u32, rgba: &[u8], max: u32) -> Option<image::RgbaImage> {
    let src = image::RgbaImage::from_raw(w, h, rgba.to_vec())?;
    let (tw, th) = if w >= h {
        (max.min(w), ((max.min(w) * h).max(1) / w).max(1))
    } else {
        (((max.min(h) * w).max(1) / h).max(1), max.min(h))
    };
    Some(
        image::DynamicImage::ImageRgba8(src)
            .resize_exact(tw, th, image::imageops::FilterType::Triangle)
            .into_rgba8(),
    )
}

/// Fit an RGBA image inside a `bw` x `bh` box, centred, padding the rest with
/// transparency — the result is always exactly `bw` x `bh`.
///
/// Menu icons are why: a screenshot is 16:10, 16:9, a window, or a phone
/// screen held upright, and icons of different widths give a menu a ragged
/// left edge where the names start. One box for all of them lines the names
/// up, and transparent padding lets the menu's own background fill it in
/// either appearance.
///
/// Never upscales: a thumbnail smaller than the box sits in the middle of it
/// at its own size rather than being blown up into a blur.
#[must_use]
pub fn fit_into_box(w: u32, h: u32, rgba: &[u8], bw: u32, bh: u32) -> Option<(u32, u32, Vec<u8>)> {
    if bw == 0 || bh == 0 {
        return None;
    }
    let src = image::RgbaImage::from_raw(w, h, rgba.to_vec())?;
    // The smaller of the two ratios is the one that fits; `min(1.0)` is what
    // keeps a small thumbnail from being upscaled.
    let scale = (f64::from(bw) / f64::from(w))
        .min(f64::from(bh) / f64::from(h))
        .min(1.0);
    let tw = ((f64::from(w) * scale).round() as u32).clamp(1, bw);
    let th = ((f64::from(h) * scale).round() as u32).clamp(1, bh);
    let fitted = image::imageops::resize(&src, tw, th, image::imageops::FilterType::Triangle);
    let mut canvas = image::RgbaImage::new(bw, bh);
    image::imageops::overlay(
        &mut canvas,
        &fitted,
        i64::from((bw - tw) / 2),
        i64::from((bh - th) / 2),
    );
    Some((bw, bh, canvas.into_raw()))
}

/// Decode a data URL this module produced back into pixels, capped to `max` on
/// its long edge.
///
/// The tray's Recent icons are the popover's own thumbnails, so a menu is
/// drawn from what the config already holds — never by reading a file, and
/// never by asking a host. `None` for anything that is not a data URL holding
/// an image this build can decode, which is the same set the popover shows.
#[must_use]
pub fn rgba_from_data_url(url: &str, max: u32) -> Option<(u32, u32, Vec<u8>)> {
    let b64 = url.split_once("base64,")?.1;
    let bytes = base64::engine::general_purpose::STANDARD.decode(b64).ok()?;
    rgba_from_bytes(&bytes, max)
}

fn rgba_from_bytes(bytes: &[u8], max: u32) -> Option<(u32, u32, Vec<u8>)> {
    let img = image::load_from_memory(bytes).ok()?.to_rgba8();
    let (w, h) = (img.width(), img.height());
    let (w, h, rgba) = cap_rgba(w, h, img.into_raw(), max);
    // cap_rgba answers "no change" with an empty buffer when the input was not
    // a valid RGBA rectangle; there is nothing to draw from that.
    (!rgba.is_empty()).then_some((w, h, rgba))
}

/// Cap a screenshot's longest side at `max`, returning the pixels to upload.
///
/// A 5K capture is ~14 megapixels, and the model on the other end does not see
/// them: vision models downsample on arrival (Claude's documented limit is about
/// 1568px on the long edge). Those pixels cost upload time over whatever link
/// the user is on, disk on their host, and tokens, and buy nothing.
///
/// `max == 0` means "send it as it is", and so does an image already inside the
/// cap — both return the buffer untouched, so the common small-screenshot case
/// pays nothing. Only an oversized image is resized, and only then is a second
/// buffer allocated.
///
/// Takes the buffer by value and gives one back for the same reason
/// [`encode_png_file`] does: the hot path must never clone a screenshot.
#[must_use]
pub fn cap_rgba(w: u32, h: u32, rgba: Vec<u8>, max: u32) -> (u32, u32, Vec<u8>) {
    if max == 0 || (w <= max && h <= max) {
        return (w, h, rgba);
    }
    let Some(src) = image::RgbaImage::from_raw(w, h, rgba) else {
        // Not a valid RGBA buffer. Returning an empty vec here would lose the
        // pixels; instead say "no change" and let encode_png_file report the
        // bad buffer, so there is one place that decides what a broken image is.
        return (w, h, Vec::new());
    };
    // `.max(1)` on both sides: a very wide, one-pixel-tall image would otherwise
    // round its short side to zero, and a zero-dimension resize panics.
    let (tw, th) = if w >= h {
        (max, ((max as u64 * h as u64) / w as u64).max(1) as u32)
    } else {
        (((max as u64 * w as u64) / h as u64).max(1) as u32, max)
    };
    // Triangle, the same filter the thumbnails use. Lanczos3 was the obvious
    // choice — text is the payload here and a cheap filter turning it to mush is
    // the one way this feature could cost someone the thing they were showing —
    // but measured on real screenshots downscaled to 55%, the three candidates
    // were indistinguishable on legibility, and Lanczos3 lost on both of the
    // things that are not subjective:
    //
    //   1920x1055 real capture → 1056x580, release build
    //     Lanczos3    resize 192ms + encode  99ms → 225 KB
    //     CatmullRom  resize 119ms + encode  78ms → 197 KB
    //     Triangle    resize  88ms + encode  79ms → 175 KB
    //
    // Sharper filters keep more high-frequency detail, which is exactly what PNG
    // cannot compress — so the "better" filter produced a 29% larger file for no
    // visible gain, on a path whose entire purpose is sending fewer bytes.
    let out = image::imageops::resize(&src, tw, th, image::imageops::FilterType::Triangle);
    (tw, th, out.into_raw())
}

/// Encode raw RGBA as a PNG file at `path`. Takes the buffer by value so the
/// hot beam path never clones a multi-megapixel screenshot.
///
/// A single cheap row filter (`Up`, good for screenshots) avoids the crate
/// default's Adaptive filtering (tries all 5 filters per row — multi-second on a
/// few-megapixel image), while keeping `Default` deflate so the file stays small
/// (transfer time dominates over slow links).
pub fn encode_png_file(path: &Path, w: u32, h: u32, rgba: Vec<u8>) -> Result<()> {
    use image::ImageEncoder;
    let buffer = image::RgbaImage::from_raw(w, h, rgba).ok_or(Error::InvalidImageBuffer)?;
    let file = std::fs::File::create(path)?;
    image::codecs::png::PngEncoder::new_with_quality(
        std::io::BufWriter::new(file),
        image::codecs::png::CompressionType::Default,
        image::codecs::png::FilterType::Up,
    )
    .write_image(buffer.as_raw(), w, h, image::ExtendedColorType::Rgba8)?;
    Ok(())
}

#[cfg(test)]
mod tests_data_url {
    use super::*;

    /// A tiny image, encoded the way a Recent thumbnail is, then read back the
    /// way the tray reads one.
    #[test]
    fn a_thumbnail_decodes_back_into_pixels_a_menu_can_draw() {
        let (w, h) = (120u32, 60u32);
        let rgba = vec![200u8; (w * h * 4) as usize];
        // 480 is the thumbnail cap the beam path uses, and it never upscales,
        // so this encodes the 120x60 as it is. (`0` is not "uncapped" here —
        // it is a zero-wide resize, which encodes to nothing.)
        let url = preview_data_url(w, h, &rgba, 480).expect("encodes");
        let (dw, dh, px) = rgba_from_data_url(&url, 0).expect("decodes");
        assert_eq!((dw, dh), (w, h));
        assert_eq!(px.len(), (w * h * 4) as usize);
    }

    #[test]
    fn a_menu_icon_comes_back_capped_on_its_long_edge() {
        let (w, h) = (480u32, 300u32);
        let url = preview_data_url(w, h, &vec![10u8; (w * h * 4) as usize], 480).expect("encodes");
        let (dw, dh, _) = rgba_from_data_url(&url, 64).expect("decodes");
        assert_eq!(dw, 64);
        assert_eq!(dh, 40, "the aspect ratio is what makes it a thumbnail");
    }

    /// Fully opaque pixels, so padding (alpha 0) is telling.
    fn opaque(w: u32, h: u32) -> Vec<u8> {
        vec![255u8; (w * h * 4) as usize]
    }

    fn alpha_at(px: &[u8], bw: u32, x: u32, y: u32) -> u8 {
        px[((y * bw + x) * 4 + 3) as usize]
    }

    #[test]
    fn every_icon_comes_out_the_same_size_whatever_went_in() {
        for (w, h) in [(480u32, 300u32), (480, 270), (300, 480), (64, 64)] {
            let (bw, bh, px) = fit_into_box(w, h, &opaque(w, h), 64, 40).expect("fits");
            assert_eq!((bw, bh), (64, 40), "{w}x{h}");
            assert_eq!(px.len(), 64 * 40 * 4, "{w}x{h}");
            // Whatever the shape, the middle is picture.
            assert_eq!(alpha_at(&px, 64, 32, 20), 255, "{w}x{h}");
        }
    }

    #[test]
    fn what_does_not_fill_the_box_is_transparent_not_stretched() {
        // Upright: bars down the sides, picture in the middle.
        let (_, _, tall) = fit_into_box(300, 480, &opaque(300, 480), 64, 40).expect("fits");
        assert_eq!(alpha_at(&tall, 64, 0, 20), 0);
        assert_eq!(alpha_at(&tall, 64, 63, 20), 0);
        // 16:9 in a 16:10 box: bars above and below.
        let (_, _, wide) = fit_into_box(480, 270, &opaque(480, 270), 64, 40).expect("fits");
        assert_eq!(alpha_at(&wide, 64, 32, 0), 0);
        assert_eq!(alpha_at(&wide, 64, 32, 39), 0);
        // Exactly 16:10 fills it edge to edge.
        let (_, _, exact) = fit_into_box(480, 300, &opaque(480, 300), 64, 40).expect("fits");
        assert_eq!(alpha_at(&exact, 64, 0, 0), 255);
        assert_eq!(alpha_at(&exact, 64, 63, 39), 255);
    }

    #[test]
    fn a_thumbnail_smaller_than_the_box_keeps_its_own_size() {
        // Centred, not blown up: 20x10 in a 64x40 box leaves a transparent
        // frame 22 columns wide on each side.
        let (_, _, px) = fit_into_box(20, 10, &opaque(20, 10), 64, 40).expect("fits");
        assert_eq!(alpha_at(&px, 64, 21, 20), 0);
        assert_eq!(alpha_at(&px, 64, 32, 20), 255);
    }

    #[test]
    fn a_box_with_no_room_in_it_is_nothing() {
        assert!(fit_into_box(48, 30, &opaque(48, 30), 0, 40).is_none());
        assert!(fit_into_box(48, 30, &[], 64, 40).is_none());
    }

    #[test]
    fn a_stored_preview_is_a_file_the_tray_can_read_back() {
        let dir = std::env::temp_dir().join("hostbeam-preview-file-test");
        let _ = std::fs::remove_dir_all(&dir);
        let (w, h) = (120u32, 60u32);
        let path = preview_file(
            &dir,
            "hostbeam-42",
            w,
            h,
            &vec![200u8; (w * h * 4) as usize],
            480,
        )
        .expect("writes");
        assert!(path.starts_with(&dir));
        assert!(path
            .file_name()
            .unwrap()
            .to_str()
            .unwrap()
            .starts_with("hostbeam-42."));
        // Whichever encoding won, the tray reads the file the same way it read
        // a data URL, and a data URL still reads.
        let (dw, dh, _) = rgba_from_thumb(path.to_str().unwrap(), 0).expect("decodes");
        assert_eq!((dw, dh), (w, h));
        let url = preview_data_url(w, h, &vec![200u8; (w * h * 4) as usize], 480).unwrap();
        assert!(rgba_from_thumb(&url, 0).is_some());
        // A dropped file gets its preview the same way.
        let src = dir.join("dropped.png");
        image::DynamicImage::ImageRgba8(
            image::RgbaImage::from_raw(w, h, vec![7u8; (w * h * 4) as usize]).unwrap(),
        )
        .save_with_format(&src, image::ImageFormat::Png)
        .unwrap();
        assert!(preview_file_from(&src, &dir, "hostbeam-43-dropped", 480).is_some());
        assert!(preview_file_from(&dir.join("gone.png"), &dir, "x", 480).is_none());
        assert!(rgba_from_thumb(dir.join("gone.png").to_str().unwrap(), 0).is_none());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn anything_that_is_not_an_image_data_url_is_nothing() {
        assert!(rgba_from_data_url("", 64).is_none());
        assert!(rgba_from_data_url("/tmp/a.png", 64).is_none());
        assert!(rgba_from_data_url("data:image/jpeg;base64,zzzz", 64).is_none());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // A solid-color RGBA buffer of w×h.
    fn rgba(w: u32, h: u32) -> Vec<u8> {
        vec![0x80; (w * h * 4) as usize]
    }

    #[test]
    fn scales_a_one_pixel_image() {
        let url = scaled_png_data_url(1, 1, &rgba(1, 1), 160).expect("encodes");
        assert!(url.starts_with("data:image/png;base64,"));
    }

    #[test]
    fn never_upscales_beyond_source() {
        // A 4×2 source asked for max 160 stays 4×2 (no upscale); just must encode.
        let url = scaled_png_data_url(4, 2, &rgba(4, 2), 160).expect("encodes");
        assert!(url.starts_with("data:image/png;base64,"));
    }

    #[test]
    fn clamps_a_large_image_to_max() {
        let url = scaled_png_data_url(2000, 1000, &rgba(2000, 1000), 480).expect("encodes");
        assert!(url.starts_with("data:image/png;base64,"));
    }

    #[test]
    fn rejects_a_buffer_with_the_wrong_length() {
        // Not w*h*4 bytes → not a valid RGBA image → None, never a panic.
        assert_eq!(scaled_png_data_url(10, 10, &[0u8; 7], 160), None);
    }

    #[test]
    fn a_stored_preview_takes_whichever_encoding_is_smaller() {
        // Recent thumbnails live in the config, which is mirrored into
        // localStorage and its ~5MB quota; a list of them once came to 9MB, the
        // mirror threw, and the window awaiting it rendered nothing. Neither
        // encoding wins outright, so picking one would have been a guess that is
        // wrong half the time — and wrong by 3-4x in both directions.
        let (w, h) = (480u32, 360u32);

        // Noise: the worst case for PNG, and what actually broke it.
        let mut noise = vec![255u8; (w * h * 4) as usize];
        let mut seed = 0x9E37_79B9u32;
        for px in noise.as_chunks_mut::<4>().0 {
            for c in px.iter_mut().take(3) {
                seed = seed.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
                *c = (seed >> 24) as u8;
            }
        }
        let picked = super::preview_data_url(w, h, &noise, 480).unwrap();
        let png = super::scaled_png_data_url(w, h, &noise, 480).unwrap();
        assert!(
            picked.starts_with("data:image/jpeg"),
            "noise should pick JPEG"
        );
        assert!(
            picked.len() < png.len(),
            "{} vs {}",
            picked.len(),
            png.len()
        );

        // A screenshot: flat panels and hard rules, where PNG wins by 4x.
        let mut shot = vec![255u8; (w * h * 4) as usize];
        for y in 0..h {
            for x in 0..w {
                let i = ((y * w + x) * 4) as usize;
                let v = if y % 24 == 0 {
                    60
                } else if x < w / 3 {
                    246
                } else {
                    255
                };
                shot[i] = v;
                shot[i + 1] = v;
                shot[i + 2] = v;
            }
        }
        let picked = super::preview_data_url(w, h, &shot, 480).unwrap();
        let jpeg = super::scaled_jpeg_data_url(w, h, &shot, 480).unwrap();
        assert!(
            picked.starts_with("data:image/png"),
            "a screenshot should pick PNG"
        );
        assert!(
            picked.len() < jpeg.len(),
            "{} vs {}",
            picked.len(),
            jpeg.len()
        );
    }

    #[test]
    fn previews_every_format_the_app_will_carry() {
        // A dropped JPEG used to beam fine and land in Recent with no
        // thumbnail, because only PNG had a decoder compiled in. These are the
        // formats `PULL_EXTENSIONS` allows and the ones a drop is most likely
        // to be; if a feature is ever dropped from Cargo.toml this fails rather
        // than silently going back to grey placeholders.
        use image::ImageFormat;
        let dir = std::env::temp_dir().join("hostbeam-preview-test");
        let _ = std::fs::create_dir_all(&dir);
        let src = image::RgbaImage::from_raw(4, 4, rgba(4, 4)).unwrap();

        for (name, format) in [
            ("shot.png", ImageFormat::Png),
            ("photo.jpg", ImageFormat::Jpeg),
            ("anim.gif", ImageFormat::Gif),
            ("pic.bmp", ImageFormat::Bmp),
            ("scan.tiff", ImageFormat::Tiff),
        ] {
            let path = dir.join(name);
            image::DynamicImage::ImageRgba8(src.clone())
                .save_with_format(&path, format)
                .unwrap();
            let preview = super::preview_from_file(&path, 64);
            assert!(preview.is_some(), "{name} decoded to no thumbnail");
            assert!(
                preview.unwrap().starts_with("data:image/"),
                "{name}: a stored preview must be a data URL, whatever it decoded from"
            );
        }

        // WebP has a decoder but no encoder here, so it is checked directly
        // rather than round-tripped. Same question either way: is the feature
        // actually compiled in, or did someone trim Cargo.toml?
        for format in [
            ImageFormat::Png,
            ImageFormat::Jpeg,
            ImageFormat::Gif,
            ImageFormat::WebP,
            ImageFormat::Bmp,
            ImageFormat::Tiff,
        ] {
            assert!(
                format.reading_enabled(),
                "{format:?} decoder is not compiled in"
            );
        }

        // Bytes that are not an image at all, and a file that is not there,
        // both mean "no thumbnail" — never a failed beam.
        let junk = dir.join("photo2.jpg");
        std::fs::write(&junk, b"not really a jpeg").unwrap();
        assert!(super::preview_from_file(&junk, 64).is_none());
        assert!(super::preview_from_file(&dir.join("gone.png"), 64).is_none());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn cap_leaves_an_image_that_already_fits_untouched() {
        let src = rgba(800, 600);
        let (w, h, out) = cap_rgba(800, 600, src.clone(), 2048);
        assert_eq!((w, h), (800, 600));
        assert_eq!(out, src, "no resize, and no re-allocation of the pixels");
    }

    #[test]
    fn cap_of_zero_means_send_it_as_it_is() {
        let src = rgba(40, 30);
        let (w, h, out) = cap_rgba(40, 30, src.clone(), 0);
        assert_eq!((w, h), (40, 30));
        assert_eq!(out, src);
    }

    #[test]
    fn cap_scales_the_long_edge_and_keeps_the_aspect_ratio() {
        // Same 16:9 shape as the 5K capture this exists for, small enough that a
        // debug-build Lanczos3 pass does not dominate the test suite.
        let (w, h, out) = cap_rgba(640, 360, rgba(640, 360), 256);
        assert_eq!((w, h), (256, 144));
        assert_eq!(out.len(), (256 * 144 * 4) as usize);
    }

    #[test]
    fn cap_handles_a_portrait_image_on_its_own_long_edge() {
        let (w, h, _) = cap_rgba(100, 400, rgba(100, 400), 200);
        assert_eq!((w, h), (50, 200));
    }

    #[test]
    fn cap_never_produces_a_zero_dimension() {
        // 600x1 asked for 150: the short side rounds to 0 without the clamp, and
        // a zero-dimension resize panics.
        let (w, h, out) = cap_rgba(600, 1, rgba(600, 1), 150);
        assert_eq!((w, h), (150, 1));
        assert_eq!(out.len(), (150 * 4) as usize);
    }

    #[test]
    fn cap_does_not_overflow_on_a_very_large_image() {
        // The dimension arithmetic must be u64: `max * h` here is 3000 * 3_000_000,
        // which overflows u32 and would panic in a debug build. No pixels are
        // resized — the buffer is deliberately the wrong length, so this exercises
        // the arithmetic and then takes the invalid-buffer path.
        let (w, h, out) = cap_rgba(4, 3_000_000, vec![0u8; 16], 3000);
        assert_eq!((w, h), (4, 3_000_000), "invalid buffer reports no change");
        assert!(out.is_empty());
    }

    #[test]
    fn cap_of_a_bad_buffer_defers_to_the_encoder() {
        // Too few bytes to be 10x10 RGBA. cap_rgba does not decide what a broken
        // image is; it hands back something encode_png_file will reject.
        let (w, h, out) = cap_rgba(10, 10, vec![0u8; 7], 5);
        assert_eq!((w, h), (10, 10));
        let path = std::env::temp_dir().join("hostbeam-cap-bad-buffer.png");
        assert!(matches!(
            encode_png_file(&path, w, h, out).unwrap_err(),
            Error::InvalidImageBuffer
        ));
    }

    #[test]
    fn encodes_a_png_file_then_rejects_a_bad_buffer() {
        let path = std::env::temp_dir().join("hostbeam-image-test.png");
        encode_png_file(&path, 2, 2, rgba(2, 2)).expect("encodes 2x2");
        assert!(std::fs::metadata(&path).unwrap().len() > 0);
        let _ = std::fs::remove_file(&path);

        let err = encode_png_file(&path, 10, 10, vec![0u8; 7]).unwrap_err();
        assert!(matches!(err, Error::InvalidImageBuffer));
    }
}
