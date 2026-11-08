# Hostbeam launch film

A ~44-second motion film (and a ~36-second cut for X) for the launch, written as code with
[Remotion](https://www.remotion.dev/) (free for companies of up to three
people, which PunkABeat is). It tells the tagline in four beats — "Agent on a
server?", "Show it anything.", "From your iPhone too.", "See what it built." —
and ends on the address. The real screen-recorded clips are the proof; this is
the attention-getter for X, Product Hunt, YouTube and the site.

```sh
cd apps/video
npm install            # its own lockfile: not an npm workspace, like apps/raycast
npm run studio         # live preview with a timeline, in the browser
npm run render         # out/hostbeam-launch-16x9.mp4 — the full film, ~44 s (~2.5 min to render)
npm run render:x       # out/hostbeam-x-16x9.mp4 — the X cut, ~36 s
npm run sounds         # remake the sound effects and the music bed (numpy + ffmpeg)
npx remotion still HostbeamLaunch out/frame.png --frame=300   # one frame
```

**On the site.** The hero's "Watch the film" (`apps/web/src/components/FilmLink.tsx`)
plays the full film from R2, not from the site: R2 answers the byte-range
requests Safari needs, and the site's static assets do not. The web copy is the
render re-packed so it can start before it has all arrived, then uploaded under
a new number — never over the old one, which is cached as immutable:

```sh
ffmpeg -i out/hostbeam-launch-16x9.mp4 -c copy -movflags +faststart /tmp/hostbeam-launch-2.mp4
(cd ../license-webhook && npx wrangler r2 object put hostbeam-releases/film/hostbeam-launch-2.mp4 \
  --file /tmp/hostbeam-launch-2.mp4 --content-type video/mp4 \
  --cache-control "public, max-age=31536000, immutable" --remote)
```

Then point `FILM_URL` in `apps/web/src/lib/links.ts` at it, and if the end card
changed, replace `apps/web/public/assets/film-poster.jpg` (the last second,
1280 wide: `ffmpeg -ss 43.3 -i … -frames:v 1 -vf scale=1280:-1 -q:v 3`).

**Two cuts, one film.** `HostbeamLaunch` and `HostbeamX` are the same
component at two paces (0.82 and 0.68). Every scene's timings are written at
pace 1 in its own `S*_TIMES` table; the pace scales the waits between moments
while each animation keeps its own speed, so a quicker cut is snappier, not
rushed. Add a cut by adding a `<Composition>` in `src/Root.tsx` with its pace.

**Sound.** Every effect and the music bed are synthesized by
`scripts/make-sounds.py` — no licence to clear. `src/Soundtrack.tsx` cues
each effect from the scenes' timing tables, so sound follows picture at any
pace. The render scripts finish with ffmpeg's `loudnorm` to about −15 LUFS,
where X and YouTube expect a video to sit. To use a licensed music track
instead, replace `public/sound/bed.mp3`; nothing else changes.


**What stays true to the product.** The popover is built from the same
`@hostbeam/ui` components as the app and the site (aliased from
`packages/ui` in `remotion.config.ts`), with the app's own English strings:
"Beaming to {host}…", "Copied to clipboard", "Running on {host}", "Open",
"open at 127.0.0.1:{port}", and the iPhone's "Copied — paste it to your
agent." Beam paths have the real shape, `hostbeam-` and 13 digits. If a string
or the popover changes in the app, change it here before the next render.

**What is staged.** The terminal session, the agent's replies, the login page
and the phone are illustrations, not recordings.

**How it moves.** Everything is driven by frame number (`src/lib.ts`), never by
CSS timers or `setTimeout`: Remotion renders frames out of order and in
parallel. That is why the beam mark is redrawn here (`BeamMarkFrame`) instead
of using the app's CSS-animated `BeamMark`.

Scenes are in `src/scenes/`, each with its length and its timings (`T`) at the
top; `src/Launch.tsx` strings them together with a 12-frame cross-fade.
