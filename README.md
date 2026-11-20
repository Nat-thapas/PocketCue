# PocketCue

Silent, vibrating cues for timing presentations. Set up a talk with alerts at specific times
(after the start or before the end), a repeating pulse, an end alert and overtime nagging. Each
cue has its own vibration pattern. Then put your phone in your pocket and present.

Built with SvelteKit 3 (static adapter), Tailwind CSS 4 and shadcn-svelte (Rhea style).

## Features

- **Talks**: multiple saved timing setups, stored in the browser (localStorage).
- **Cues**: one-off alerts (elapsed or remaining time), a repeating pulse, an end-of-talk alert and
  repeating overtime alerts. Cues that coincide are merged and the most important pattern wins.
- **Patterns**: 10 presets plus a custom pattern editor (vibrate/pause steps or a raw `200, 100, 200`
  sequence), with a test button everywhere.
- **Run screen**: big elapsed/remaining clock (tap to switch), progress bar with cue markers, next
  cue preview, amber/red colour phases, overtime pulse, screen flash and alert label.
- **Controls**: start countdown, pause/resume, −/+ nudge (amount set per talk, with a default in
  Settings), stop, all optionally protected by hold-to-confirm against accidental taps.
- **Full screen** while presenting hides the browser controls (skipped when installed as an app).
- **Pocket mode**: black, dimmed screen; double-tap to leave.
- **Screen Wake Lock** keeps the screen on while the timer runs. A running timer survives reloads.
- Optional beeps mirroring each vibration (for rehearsing), light/dark/system theme, installable
  offline PWA.

> The Web Vibration API works on Android (Chrome, Edge, Samsung Internet, Firefox), not on iOS. The
> page must stay open and visible for vibrations to fire.

## Development

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm check        # svelte-check
pnpm lint
pnpm build        # static site in ./build
```

To try it on your phone during development, run `pnpm dev --host` and open the LAN URL. Wake Lock
and the service worker need HTTPS (or localhost), so test those on the deployed site.

Imports from `src/lib` use the Node subpath alias `#lib` with explicit extensions, e.g.
`#lib/store.svelte.js` or `#lib/components/ui/button/index.js`.

## Deployment

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every push to `main`.

1. In the repository go to **Settings → Pages**, and set **Source** to **GitHub Actions**.
2. Set your **Custom domain** on the same page. The site is served from the domain root.
