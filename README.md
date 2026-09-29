# Cairn

A launch site for **Cairn**, a fictional pair of machined devices that lock your distracting phone apps. **Home** is a dial: turn it, and the apps you choose stay locked while your phone is in the room. **Pocket** is a disc you tap by the door. Getting the apps back takes getting up.

It's a portfolio piece: a design and front-end concept. Nothing ships and the forms send nothing.

## What's on the page

- **Turn your phone down.** The hero opens calm: a white page, the headline and a 3D dial. As you scroll the pinned hero, real apps' notifications arrive one at a time around the dial, each with a chime. Then the dial clicks to Desk, Room and Home, a zone of the mode's colour spreads across the floor, the banners inside it are swept out, and the page falls from day to night. You can turn the dial five ways:
  - scroll through the pinned hero;
  - drag the crown round;
  - use the arrow keys (the dial is a slider);
  - pick Off, Desk, Room or Home;
  - on a phone, tap.

  Each detent clicks, and the glass band between crown and body glows in the mode's colour: Desk orange, Room pink-red, Home violet. At Home one notification is left: Cairn's own "Quiet is on".
- **How it works, in a 3D house.** A cutaway of a lived-in flat on an evening, in its own canvas. The zone floods out from the dial on the study desk and stops at the walls: the desk, then the study, then the whole flat, locking the phones it reaches. In the last step someone walks from bed to the dial and turns it down.
- **The devices in real 3D.** One fixed Three.js canvas draws Cairn Home and Cairn Pocket wherever a section asks for them, in turned titanium lit by a baked studio. Before WebGL starts, stills of the same scene stand in, in the same framing.
- **Cairn Pocket, told on scroll.** Its own 3D story (the disc, a buzzing phone, the tap, the coil inside, the wall by the door), then a hallway wall where you drag a phone onto Pocket to lock it.
- **Inside.** A pinned exploded view pulls the dial into seven parts. Each name sits level with its part; pointing at a name or a part picks it out on the dial.
- **The rest of a real launch page:**
  - four titanium finishes that recolour the devices live;
  - a working iOS app demo on a drawn iPhone, in step with the dial;
  - a time-back board: the days a year the apps take, and the days Cairn gives back, drawn as a calendar year;
  - what's in the box, specs, a comparison, fictional reviews and an FAQ;
  - pre-order with pair pricing, a newsletter and contact.
- **An identity of its own.** The logo is the dial seen from above: the ring, the ceramic face and its indicator dot. In the nav it's live: its arc fills to the zone you set, in that mode's colour.

## Stack

- Next.js 16 (App Router, static export), React 19 and TypeScript.
- Three.js for the devices. GSAP with ScrollTrigger and SplitText handles the pinned tracks, the reveals and the sweep, and Lenis provides smooth scrolling.
- Mona Sans (with its width axis) for everything, and Doto, a dot-matrix face, for the device's readouts.
- Sound is off by default. When turned on, it's synthesised with Web Audio (the notification chime, the buzz, each detent's click and Pocket's tap), so there are no audio files.
- The stills in `public/stills/` are rendered from the site's own WebGL scene by `scripts/render-stills.mjs`. Each carries its provenance in a sidecar and in the file.

## Run it

```sh
pnpm install
pnpm dev                          # http://localhost:3000
pnpm build && pnpm start          # the static export, served compressed
```

## Checks

Each check is a script in `scripts/`:

| Script | Proves |
| --- | --- |
| `verify-build.mjs` | Type-check, lint, static export |
| `verify-hero.mjs` | The hero's buttons work at six window sizes; the notifications arrive a few at a time and one after another however fast you scroll; the dial clicks to Desk, Room and Home, with no rim at Home |
| `verify-modes.mjs` | Each mode's colour reaches the root, the control and the 3D dial |
| `verify-content.mjs` | Every section and its content, Pocket's and the titanium finishes among them; no stone words; at most 950 of the page's own words |
| `verify-browser.mjs` | Every way of turning the dial, the house's zone, Pocket's story and tap, the exploded view's picking, the app, the time back, the forms, pricing, reduced motion and overflow, in Playwright |
| `verify-a11y.mjs` | axe, calm, with the noise in, at Home and after some play, at desktop and phone widths |
| `verify-sound.mjs` | The notification sound is a bright, decaying chime, not a buzz |
| `verify-lighthouse.mjs` | Lighthouse, median of three runs, desktop and mobile |
| `verify-secret.mjs` | The FAL key is in neither the export nor git |
| `verify-provenance.mjs` | Every raster carries its origin |
| `verify-detector.mjs` | The design detector finds nothing |
| `verify-design-docs.mjs` | DESIGN.md matches the shipped tokens |
| `verify-brand.mjs` | The logo and favicon are the dial; no stacked-stone mark ships (proven on the old one) |

## Credit

Concept, design and build by Aphelin · [GitHub](https://github.com/aphelin). Cairn is fictional; the reviews are invented.
