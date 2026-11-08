import { useRef } from "react";
import { Ic } from "@hostbeam/ui";
import { FILM_POSTER, FILM_URL } from "../lib/links";

// The launch film, one click from the hero rather than in it: the live demo
// beside it proves more to a sceptical reader than a film with music, and most
// launch visitors will have seen the film on X or Product Hunt already.
//
// Nothing of it loads before the click: preload="none", and the poster is set
// only on opening. play() is called inside the click handler itself, because
// that is the one place every browser lets a video start with sound — iOS
// Safari refuses it even a render later, and so did Chrome when the <video>
// was created after the click. Closing (the button, Esc, or a click outside)
// pauses it.
export default function FilmLink() {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  const open = () => {
    const d = dialog.current;
    const v = video.current;
    if (!d || !v) return;
    if (!v.poster) v.poster = FILM_POSTER;
    if (v.ended) v.currentTime = 0;
    d.showModal();
    // Refused in Low Power Mode and the like: the controls are there to press.
    v.play().catch(() => {});
  };
  const close = () => dialog.current?.close();

  return (
    <>
      <button type="button" className="film-link" aria-haspopup="dialog" onClick={open}>
        <span className="film-link-play" aria-hidden="true">
          <svg width="10" height="11" viewBox="0 0 10 11" fill="currentColor">
            <path d="M1 1.2v8.6a.6.6 0 0 0 .9.5l7.2-4.3a.6.6 0 0 0 0-1L1.9.7a.6.6 0 0 0-.9.5Z" />
          </svg>
        </span>
        Watch the film <span className="film-len">0:44</span>
      </button>
      <dialog
        ref={dialog}
        className="film-dialog"
        aria-label="Hostbeam launch film"
        onClose={() => video.current?.pause()}
        onClick={(e) => {
          // A click on the dialog itself, not its contents, is a click on the backdrop.
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="film-frame">
          <button type="button" className="film-close" aria-label="Close the film" onClick={close}>
            <Ic name="x" size={18} />
          </button>
          <video ref={video} src={FILM_URL} controls playsInline preload="none" />
        </div>
      </dialog>
    </>
  );
}
