# Cairn

A launch site for **Cairn**, a fictional stone that locks your distracting phone apps. Tap your phone on it and the apps you chose stay locked until you walk back and tap again.

It's a portfolio piece: a design and front-end concept. Nothing ships and the forms send nothing.

## What's on the page

- **The noise going quiet.** The hero opens on a sign-yellow field littered with buzzing notifications. You can quiet it four ways:
  - drag the phone onto the 3D stone;
  - scroll;
  - press "Tap to quiet";
  - use the keyboard.

  On contact, contour rings spread from the stone, push every notification off the page, and leave a topographic map with the stone at its summit.
- **One stone that travels.** A single WebGL stone moves from the hero to "How it works", then to the stones, then to the colour picker. It's procedural, with cast-stone mottling, speckle and an engraved cairn mark computed in the shader.
  - On phones, each section keeps its own stone.
  - Before WebGL starts, still renders of the same scene stand in, in the same framing.
- **A signpost for a navbar.** A white location plate and arrow plates show reading time from where you are. Plates behind you point back, and a blaze-red dot marks where you are.
- **The rest of a real launch page:**
  - both models, with Home's range as contour rings you can widen;
  - four colours;
  - a working app demo (place a stone on an app to lock it);
  - a time-back calculator;
  - what's in the box, specs, a comparison, fictional reviews and an FAQ;
  - pre-order with pair pricing, a newsletter and contact.

## Stack

- Next.js 16 (App Router, static export), React 19 and TypeScript.
- Three.js (the stone) and GSAP with ScrollTrigger (the pinned hero and the displacement). Lenis provides smooth scrolling.
- Sound is off by default. When turned on, it's synthesised with Web Audio: no audio files.
- The stills in `public/stills/` are rendered from the site's own WebGL scene by `scripts/render-stills.mjs`. Each carries its provenance in a sidecar.

## Run it

```sh
pnpm install
pnpm dev                          # http://localhost:3000
pnpm build && pnpm start          # the static export, served compressed
```

## Checks

`GATES.md` lists every check. Each one is a script in `scripts/`:

| Script | Proves |
| --- | --- |
| `verify-build.mjs` | Type-check, lint, static export |
| `verify-content.mjs` | Every section and its content; at most 900 visible words |
| `verify-browser.mjs` | The interactions, forms, pricing, reduced motion and overflow, in Playwright |
| `verify-a11y.mjs` | axe, in the noisy and quiet states, at desktop and phone widths |
| `verify-lighthouse.mjs` | Lighthouse, median of three runs, desktop and mobile |
| `verify-secret.mjs` | The FAL key is in neither the export nor git |
| `verify-provenance.mjs` | Every raster carries its origin |
| `verify-detector.mjs` | The design detector finds nothing |
| `verify-design-docs.mjs` | DESIGN.md matches the shipped tokens |

## Credit

Concept, design and build by Aphelin · [GitHub](https://github.com/aphelin). Cairn is fictional; the reviews are invented.
