---
name: Cairn
description: A launch page for a machined dial that turns your phone down, where each turn clicks the page into a mode with its own colour and the noise of real apps is blown away.
colors:
  paper: "#ffffff"
  mist: "#f2f2f0"
  mist-2: "#e6e6e3"
  ink: "#0b0b0c"
  ink-2: "#56565b"
  night: "#070708"
  night-2: "#121215"
  night-3: "#1d1d21"
  dawn: "#f4f4f2"
  dawn-2: "#a3a3aa"
  mode-desk: "#ffa53d"
  mode-desk-ink: "#1c1000"
  mode-room: "#ff4d6d"
  mode-room-ink: "#23000a"
  mode-home: "#7555ff"
  mode-home-ink: "#ffffff"
  signal-red: "#d9352b"
typography:
  display:
    fontFamily: "Mona Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(3.1rem, 1rem + 6.4vw, 6rem)"
    fontWeight: 760
    lineHeight: 0.94
    letterSpacing: "-0.028em"
    fontVariation: "'wdth' 116"
  headline:
    fontFamily: "Mona Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.35rem, 1.2rem + 3.9vw, 4.6rem)"
    fontWeight: 760
    lineHeight: 0.98
    letterSpacing: "-0.026em"
    fontVariation: "'wdth' 116"
  title:
    fontFamily: "Mona Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.35rem, 1.1rem + 0.9vw, 1.9rem)"
    fontWeight: 680
    lineHeight: 1.12
    letterSpacing: "-0.018em"
    fontVariation: "'wdth' 108"
  lede:
    fontFamily: "Mona Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.14rem, 1.04rem + 0.42vw, 1.42rem)"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "-0.006em"
  body:
    fontFamily: "Mona Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1rem, 0.96rem + 0.18vw, 1.12rem)"
    fontWeight: 400
    lineHeight: 1.55
    fontVariation: "'wdth' 100"
  label:
    fontFamily: "Mona Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(0.86rem, 0.83rem + 0.12vw, 0.94rem)"
    fontWeight: 600
  readout:
    fontFamily: "Doto, Mona Sans, monospace"
    fontWeight: 800
    letterSpacing: "0.02em"
    fontFeature: "'tnum'"
rounded:
  focus: "0.5rem"
  field: "0.875rem"
  card: "1.25rem"
  tile: "1.75rem"
  pill: "999px"
spacing:
  gutter: "clamp(1.25rem, 0.5rem + 3vw, 3.5rem)"
  section: "clamp(6rem, 3.5rem + 7vw, 11rem)"
  wide: "1320px"
  nav-h: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "0 1.4rem"
    height: "3rem"
  button-primary-night:
    backgroundColor: "{colors.dawn}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 1.4rem"
    height: "3rem"
  button-primary-lg:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "0 1.75rem"
    height: "3.5rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 1.4rem"
    height: "3rem"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0.8rem 1rem"
    height: "3.25rem"
  input-night:
    backgroundColor: "{colors.night-2}"
    textColor: "{colors.dawn}"
    rounded: "{rounded.field}"
    padding: "0.8rem 1rem"
    height: "3.25rem"
  tile:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    padding: "clamp(1.4rem, 2.4vw, 2rem)"
  tile-night:
    backgroundColor: "{colors.night-2}"
    textColor: "{colors.dawn}"
    rounded: "{rounded.tile}"
    padding: "clamp(1.4rem, 2.4vw, 2rem)"
  mode-thumb-off:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
  mode-thumb-desk:
    backgroundColor: "{colors.mode-desk}"
    textColor: "{colors.mode-desk-ink}"
    rounded: "{rounded.pill}"
  mode-thumb-room:
    backgroundColor: "{colors.mode-room}"
    textColor: "{colors.mode-room-ink}"
    rounded: "{rounded.pill}"
  mode-thumb-home:
    backgroundColor: "{colors.mode-home}"
    textColor: "{colors.mode-home-ink}"
    rounded: "{rounded.pill}"
---

# Design System: Cairn

## Overview

**Creative North Star: "The Product Film That Changes Colour"**

Cairn is shot like a gadget launch film. White day sections and near-black night sections alternate down the page, and the product is the one Cairn-made object on stage. That product is Cairn Home, the Halo band: a dial of turned titanium (Graphite by default) with a micro-suction pad, a filleted body, a frosted glass band, a knurled crown and a thick rounded rim round an inset ceramic button. Its partner is Cairn Pocket, a low titanium disc of the same family, which gets two sections of its own: a scroll story in its own 3D scene and a tap to try. Both are rendered in real 3D: one fixed Three.js/WebGL canvas with an orthographic camera measured in CSS pixels. Each section that shows a device places an anchor in its layout, and every anchor gets its own device, framed by that anchor's shot. The page is the interface. In the hero, the dial turns through four detents, Off, Desk, Room and Home. Each mode lights the glass band in its own colour, and the page takes that colour with it.

The system stays quiet so that the colour change reads. Ink sits on white and light ink on night. Mona Sans does everything from wide, heavy headlines to plain text, and its width axis stands in for a second family. Doto, a dot-matrix face, is the device's own voice and appears only in readouts. Controls are pills, containers are large rounded tiles with no borders, and depth comes from the ground changing, not from stacked cards. Colour has two sources. The first is the modes: Desk orange, Room pink-red and Home violet, shown only while a mode is on. The second is the noise, the real apps (YouTube, TikTok, Instagram, WhatsApp and others) whose notifications crowd the calm page and are blown away as the zone grows.

Motion is springs and detents. The hero plays in three beats. First it is calm. Then the notifications arrive one at a time as you scroll, each with a chime. Then, after a beat with the full crowd, the dial rises, punches forward and clicks to Desk in a burst of its colour, and on to Room and Home as night falls. Every turn clicks: a stepped angle, a synthesised tick, a 6 ms haptic on touch. Section titles rise line by line out of a mask once, as they arrive. With reduced motion there is none of this, only native scrolling.

**Key Characteristics:**
- Alternating day (#ffffff), mist and night (#070708) section grounds; a section declares its theme and its ink, lines, tiles, buttons and focus follow.
- A colour for each mode: Desk #ffa53d, Room #ff4d6d, Home #7555ff. The root carries the current mode's colour while the dial is on, and every mode-aware element takes it.
- Real apps are the noise: their own names and icons, in their owners' colours, never Cairn's.
- Mona Sans on a width axis (116 display, 108 titles, 100 text); Doto 800 only for device readouts.
- The Halo band and Pocket as real-time WebGL objects in turned titanium: lathe geometry, knurl maps (180 ridges on Home, 140 on Pocket), a translucent frosted glass band lit in the mode's colour, micro-suction pads, and a soft grey studio whose light shifts from day to night.
- Pill controls, 1.75rem tiles, 0.875rem fields; hairline inset rings instead of borders.
- Detent motion: stepped, sprung, audible and felt.

## Colors

A near-monochrome film with three lights in it, one per mode.

### Primary
The mode colours are one role in three states: the colour of the mode the dial is set to. `lib/modes.ts` holds the same values for the 3D stages. While a mode is on, the root carries `--mode` and `--mode-ink` for that mode. `--accent` follows `--mode`, and falls back to Desk's colour while the dial is Off, so an element that must show some colour at Off, such as the pip on each finish swatch or Pocket's lock (Pocket locks on its own, whatever the dial says), shows Desk's. Mode-aware elements read `var(--mode, var(--accent))`.
- **Desk Orange** (#ffa53d), with **Desk Ink** (#1c1000) on it: the first detent, one metre, the warm light of a desk lamp.
- **Room Pink-Red** (#ff4d6d), with **Room Ink** (#23000a) on it: the second detent, four metres.
- **Home Violet** (#7555ff), with white (#ffffff) on it: the third detent, twelve metres, the colour of night falling. Where white text sits on it at small sizes, the violet is deepened toward ink for contrast: 90% violet in How's chips, and an 84% oklab mix (`--mode-home-deep`) inside the app.

Where they appear: the dial's glass band and its bloom; the hero's floor zone, colour burst and mode-control thumb; the logo's arc and dot; the pip on each finish swatch; the zone's flood through the 3D house, the glowing cut tops of the walls it meets, its ripples, and the locked phones' screens and pins; Pocket's lock in its story and in Give it a tap (the tap's ripple, the lock badges and the status dot); and the app's switches, selected segments, rings, schedule blocks and chart.

### Neutral
- **Paper** (#ffffff): the day ground. The hero starts here, and html is painted with it.
- **Mist** (#f2f2f0): the mist ground (Devices, AppDemo, Compare, Contact), and the tile colour on day sections.
- **Mist Deep** (#e6e6e3): the second tile tone on day, and the house stage's backdrop.
- **Ink** (#0b0b0c): text on day and mist, the day primary button, the mode thumb at Off, the focus ring on light grounds.
- **Ink Soft** (#56565b): secondary text on light grounds: ledes, small print, idle nav links, placeholders.
- **Night** (#070708): the night ground (Statement, Pocket's story, Inside, TimeBack, Preorder, Footer), and the colour the hero sinks to at Home.
- **Night Raised** (#121215): tiles and fields on night.
- **Night Raised 2** (#1d1d21): the second tile tone on night, and the resting dots of TimeBack's year. The year's other two states are night inks too, never mode colours: every day on the apps wears a Dawn Soft ring, and each day Cairn gives back is also filled in Dawn inside it.
- **Dawn** (#f4f4f2): text on night, the night primary button, the focus ring on night.
- **Dawn Soft** (#a3a3aa): secondary text on night.
- **Lines**: hairlines are the theme's ink at low alpha, `rgb(11 11 12 / 0.1)` and `/ 0.22` on light grounds, `rgb(244 244 242 / 0.12)` and `/ 0.26` on night. They are not separate tokens.

### Status
- **Signal Red** (#d9352b): form errors, as a 2px inset ring on an invalid field and a small dot before the error line, with the error text in the ground's ink. The 3D house's phones also use it as their notification-badge red: part of the depicted noise, the same red a phone's badge carries.

### Named Rules
**The Colour Is The Mode Rule.** Cairn's own colour means a mode is on, and which one: Desk orange, Room pink-red, Home violet. It never marks a link, a hover, a price, a heading or a success message; a reservation's check is drawn in the ground's ink. Mode-aware elements read `var(--mode, var(--accent))` so they change together as the dial turns.

**The Colour Is Noise Rule.** Every other saturated colour on the page belongs to the real apps that interrupt you (YouTube, TikTok, Instagram, WhatsApp, Snapchat, Discord, Netflix, Reddit and X), in their own icons and their owners' brand colours. They are depicted, not Cairn's palette, and never leak into Cairn's own UI. Product finishes (Graphite, Natural, Sage and Chalk, all titanium, and the white ceramic top) are product data rendered on the object, not UI colours; they are toned so that none sits between the mode colours.

**The Ground Declares Rule.** A section sets `data-theme` to day, mist or night, and everything inside it takes its ink, lines, tiles, button and focus colours from that. Components never hard-code a ground's colour, and the nav takes the colour of the section under it.

## Typography

**Display Font:** Mona Sans at width 116 (with Helvetica Neue, Arial)
**Body Font:** Mona Sans at width 100 (with Helvetica Neue, Arial)
**Label/Mono Font:** Doto, dot-matrix, weight 800 (with Mona Sans, monospace), for device readouts only

**Character:** One variable grotesque stretched wide and heavy for headlines and left at normal width for reading, so the page speaks with one voice at two volumes. Doto is the dial's LED voice: it looks printed by the device, not typeset.

### Hierarchy
- **Display** (760, wdth 116, clamp(3.1rem → 6rem), 0.94, -0.028em): the hero headline "Turn your phone down." only. Balanced wrap.
- **Headline** (760, wdth 116, clamp(2.35rem → 4.6rem), 0.98, -0.026em): section titles, capped at 16ch, balanced. These are the lines that rise out of a mask on arrival.
- **Title** (680, wdth 108, clamp(1.35rem → 1.9rem), 1.12, -0.018em): step names, model names and tile titles.
- **Lede** (400, clamp(1.14rem → 1.42rem), 1.4, -0.006em): one line of offer under a title, in the ground's soft ink, capped at 36ch, pretty wrap.
- **Body** (400, wdth 100, clamp(1rem → 1.12rem), 1.55): running text, FAQ answers, specs.
- **Label** (600, clamp(0.86rem → 0.94rem)): field labels. At weight 400 in soft ink, the same size is small print and notes.
- **Buttons and nav** (620 at wdth 104 for buttons, 540 for nav links, 0.92–1.06rem): sentence case, never uppercase.
- **Readout** (Doto 800, 0.02em, tabular figures): the ranges under the hero's mode control (0 m, 1 m, 4 m, 12 m) and the range in the house's mode readout.

### Named Rules
**The One Family Rule.** Mona Sans carries every word of Cairn's own copy. Heading contrast comes from width (116 against 100) and weight (760 against 400), never from a second display face. The drawn phone's app sets Mona Sans at iOS's own point sizes (17px body) because it depicts an iOS app.

**The Readout Rule.** Doto appears only where the device itself would print a value. It is never used for headings, prices or decoration.

**The Sentence Case Rule.** Headings and controls are sentence case. There are no uppercase labels or tracked-out small caps anywhere in the build.

## Layout

The page is one long column of full-bleed sections. Each has fluid vertical padding (`section`, 6rem to 11rem) and horizontal `gutter` (1.25rem to 3.5rem), with content in a centred `wide` column of at most 82.5rem (1320px). The nav row stands on the content column's edges, is 4rem tall and fixed, and its links are centred on the page. Type and spacing are fluid from a 390px to a 1600px viewport, so there are few hard steps. Past a 1920×1080 window the root font size grows with whichever side runs out first (20px at 2560×1440 and 3440×1440, never past 22px), so large displays see the laptop composition a quarter larger; sizes meant to grow with it are set in rem, and on an ultrawide the hero's noise stays in a box no wider than 16:10 of the window's height.

The section grounds follow a film cut. The hero starts on day, then night Statement, day How, mist Devices, night Pocket's story, day Give it a tap, night Inside, day Finishes, mist AppDemo, night TimeBack, day Details (a bento with a night band inside it), mist Compare, day Reviews, night Preorder, day FAQ, mist Contact and night Footer.

The hero is a pinned scroll track in three beats. At rest it is calm: the centred headline, one line of offer, two pills and the dial below them, with no notifications, so the buttons are never covered. The track is 540svh (460svh on phones). The headline steps aside over the first 1–7.5% and the dial rises over 2–18%. Between 5% and 47% of the track the notifications arrive one at a time, each with about a fifth of a screen of scroll to itself. However fast the scroll, they land 140ms apart, each with a chime; going back, they leave in reverse, 70ms apart. They sit in rings round the risen dial by the mode that sweeps them (Desk's nearest, Room's further out, Home's at the edges), kept clear of the middle, and each card's position is clamped at least 16px inside the window. At 51%, 66% and 81% the dial clicks to Desk, Room and Home. A click up waits for the noise to land, holds the full crowd for 450ms, then takes one detent at a time, at least 480ms apart. A zone set by hand cancels any detents still queued. Once the hero is half scrolled away, anything still queued catches up at once and silently.

Each mode's zone is a pool of its colour with a 2px rim, sized so the rim falls between the notifications it takes and the ones it leaves, and capped to stay inside the window, 12–28px clear of its edges and the nav bar. The rim fades out from Room to Home (at Home only the pool shows), and whenever the ellipse comes within 12px of an edge. As the rim fades, the stage's bottom 14svh fades the pool into the ground, so the hero never ends in a straight violet edge. The dial zooms (to 1.26, 1.32 and 1.38 on wide screens), and the ground is interpolated from Paper to Night at 0, 8%, 80% and 100% for Off, Desk, Room and Home; past the middle of the fall to night, the hero switches its own theme to night. The control sits on a softly blurred island of the ground's colour. It shows only while a rim does, so a rim passing behind the control fades instead of crossing its text. Cairn's toast sits beside the risen dial, clamped inside the window, or centred just above the dial between 761px and 1180px. On phones a new notification drops onto the front of the lock-screen stack; four layers show and the rest tuck away, and each detent clears the front ones. With reduced motion the hero is one still composition at Home: the headline, Cairn's toast centred above the dial, the dial at rest (not zoomed) just clear of the control, then the control.

How is a sticky stage: the 3D house stays in view while the three steps (choose, turn, get up) scroll past it. Pocket's story is another pinned track (560svh, 520svh on phones): its own 3D canvas holds still at the right while its words change one beat at a time on the left; narrow screens and portrait tablets stack the scene over the words. Give it a tap follows as a two-column section: the words and the tap button on the left, a still of the same hallway wall on the right, with the drawn phone across the room from Pocket. Inside is a pinned track too (290svh): the title on the left, the dial in the middle coming apart, the part names on the right. TimeBack is a two-column board where each control stands over the number it moves: the hours slider and the share control on top, the two big figures under them, then the year. Later sections alternate between a text column and a device in its own anchor, or use a three-column bento of tiles (Details: the box's list down the left, the facts two rows high beside it; two columns on tablets, one on phones) with a gap of 0.75rem to 1.25rem. AppDemo sets a column of notes beside the drawn phone. Grids collapse to one column at component-level breakpoints, mostly between 820px and 980px.

**The One Idea Per Screen Rule.** Each section carries a single title, at most one lede and one interaction or object. Density comes from tiles inside a section, never from stacking several ideas in one viewport.

## Elevation & Depth

The interface is flat and tonal. Tiles sit on the ground as a slightly different tone (Mist on Paper, Paper on Mist, Night Raised on Night) with no shadow and no border. Real depth belongs to the 3D scenes. The devices are lit by a baked studio environment: a soft grey room, 0.11 linear at the floor to 0.24 overhead, with two soft grey flags either side of the device (so walls turning away fall off to mid-grey, not black), a broad scrim behind the camera, the overhead softbox, a tall front-left key strip, a thin back-right rim strip and a white sweep. Day and night lighting is set per device (at night the environment is 1.35 − 0.6·night and the key 1.5 − 0.7·night). Pocket's story is lit by the same studio at its night values, fading to a faint rim and a warm downlight as the hallway wall comes up. The house is a lived-in flat on an evening: oak floors, walnut furniture, rugs, fabric and tiles under warm lamps, with a dusk sky in the windows. Shadows in the DOM appear only on things that are physically objects in the scene.

### Shadow Vocabulary
- **Banner float** (`box-shadow: 0 0 0 1px rgb(11 11 12 / 0.06), 0 2px 6px rgb(11 11 12 / 0.05), 0 18px 40px -20px rgb(11 11 12 / 0.4)`): the hero's notifications, which hover over the stage like a phone's.
- **Pin float** (`box-shadow: 0 0 0 1px rgb(11 11 12 / 0.06), 0 2px 6px rgb(11 11 12 / 0.08), 0 16px 30px -14px rgb(11 11 12 / 0.45)`): the notification pins over the house's phones.
- **Night toast** (`box-shadow: 0 0 0 1px rgb(255 255 255 / 0.08), 0 24px 50px -24px rgb(0 0 0 / 0.8)`): the Cairn app's "Quiet is on" notification that appears at Home.
- **Drawn phone** (`--ios-phone-shadow`: `inset 0 0 0 1.5px #3a3a3e, inset 0 0 0 4px #0b0b0c, 0 50px 80px -40px rgb(11 11 12 / 0.55), 0 16px 30px -18px rgb(11 11 12 / 0.4)`): the app demo's handset body.
- **Thumb** (`box-shadow: 0 0 0 1px rgb(255 255 255 / 0.18), 0 6px 14px rgb(0 0 0 / 0.5)`): the time-back slider's knob.
- **Mode glow** (`box-shadow: 0 0 22px color-mix(in srgb, var(--mode) 45–50%, transparent)`; for the hero's floor zone a 2px rim at 90%, a pool at 26% in the centre, and `0 0 32px` at 40% with `inset 0 0 48px` at 18%, the rim fading with `--rim`, set on the hero root (0 at Home); for the house locks a 3px ring at 22% and `0 0 22px` at 55%): light emitted in the mode's colour. It exists only while a mode is on, or while Pocket's lock is.
- **Hairline ring** (`box-shadow: inset 0 0 0 1.5px var(--line-strong)`): the edge of ghost buttons and fields. This is an edge, not elevation.

### Named Rules
**The Objects Cast Shadows Rule.** A shadow means an object is in the room: a notification, a pin, a phone, a knob, the toast. Tiles, buttons and sections never get a drop shadow. They separate by tone.

**The Light Is Emitted Rule.** A mode's glow is light coming from the device, so it only exists while that mode is on, and it is never used as a decorative halo.

## Shapes

The form language is the object's own: circles and pills from a round, turned product. Controls are full pills (999px): buttons, nav links and their current-section bar, icon buttons, the mode control and its thumb, How's zone chips, the slider track and the house's readout. Containers are large soft rectangles: tiles at 1.75rem, table cards at 1.25rem, fields at 0.875rem. Step numbers, swatches, the error dot and the order confirmation are true circles. The hero's zone is an ellipse on the floor, drawn in perspective. Edges are hairline inset rings (1.5px), not borders. Focus rings follow the element's own shape, and on text with no radius of its own, such as links and FAQ questions, the ring takes the focus corner (0.5rem). Lists and the scrolled nav use 1px rules in the ground's line colour. The mark is the dial seen from above: a ring, a ceramic face, an indicator dot and a scale arc that fills with the mode's colour up to the set detent.

Depicted things keep their own values, outside the token scale:
- the drawn iPhone's iOS radii, greys, separators, glass, springs, titanium rail and semantic trend colours, all declared as `--ios-*` custom properties on the phone (`AppDemo.module.css` for the handset, `components/app/ios.module.css` for the screen);
- the notification corners (1.15rem) and the house pins' corners;
- the real apps' icons, whose corners follow iOS's proportion of the tile (22.5%) and whose colours are their owners';
- the TimeBack thumb, drawn as the dial seen from above in its Graphite finish;
- the 3D scenes' materials: titanium and ceramic, the light guide, and the house's oak, walnut, fabric and tile.

They depict a real handset, other companies' apps or the product itself, not Cairn's own UI, and each carries a file-scoped, reasoned detector exception in `.impeccable/config.json`. The drawn phone's app, the hero's notifications and the house carry `data-depicted`, so the copy word budget counts only the page's own words. New UI takes its values from the tokens above.

## Components

### Buttons
Pills that take the ink of their ground: solid and calm, with a small spring.
- **Shape:** full pill (999px), 3rem tall; the large variant is 3.5rem.
- **Primary:** the ground's ink as the fill. That is Ink on Paper text on day and mist, and Dawn on Ink text on night. Padding is 0 1.4rem (large: 0 1.75rem), Mona Sans 620 at wdth 104, 1rem (large: 1.06rem). A trailing arrow icon is optional.
- **Hover / Focus:** the arrow slides 0.18em forward. Press scales to 0.97 (260ms, ease-out). Focus is a 2px outline in the ground's ink, offset 3px. On fine pointers, large pills lean up to 10px by 7px toward the cursor and settle back.
- **Ghost:** transparent, in the ground's ink, with a 1.5px inset ring in the strong line colour. On hover the ring turns to full ink.
- **Disabled:** 40% opacity, no press.

### Mode Control (signature)
The hero's segmented Off / Desk / Room / Home radiogroup under the dial.
- **Style:** a pill track holding four pill buttons. Each has its label in Mona Sans 620 and its range in a Doto readout under it.
- **State:** a pill thumb slides to the chosen detent (520ms, ease-out). At Off the thumb is the ground's ink. Past Off it takes the mode's colour, with that mode's ink for text and a glow in the same colour.
- **Behaviour:** click, arrow keys, dragging the dial (one detent per 40° of hand movement) and scrolling the pinned track all set the same level. Each change clicks audibly and the line under the control announces the zone politely.

### Chips
- **Style:** How's zone row: a tile-coloured pill track with pill chips in soft ink at 600 weight.
- **State:** the active chip takes the section's own mode colour and ink, with a glow while a mode is on. How keeps its own mode; the hero's dial is the visitor's.

### Cards / Containers
- **Corner Style:** tiles 1.75rem, table cards 1.25rem.
- **Background:** the theme's tile tone (Mist on day, Paper on mist, Night Raised on night), with the second tone for nested panels and hovers.
- **Shadow Strategy:** none; see Elevation.
- **Border:** none. Rows inside tiles are split by 1px lines.
- **Internal Padding:** clamp(1.4rem, 2.4vw, 2rem), with a minimum height of 14rem in the bento.

### Inputs / Fields
- **Style:** the ground's field colour (Paper, or Night Raised on night), a 0.875rem radius, a 3.25rem minimum height, padding of 0.8rem 1rem, and a 1.5px inset ring in the strong line colour. Placeholders are in soft ink. Labels sit above in 600 weight, with a 0.45rem gap. Textareas are at least 8rem tall and not resizable.
- **Focus:** the ring thickens to 2px in the ground's ink, with a 4px outer halo in the line colour.
- **Hover:** the ring darkens to soft ink.
- **Error:** a 2px Signal Red inset ring, and an error line in ink led by a small red dot.

### Navigation
- **Style:** a fixed 4rem bar, transparent over the hero. Once the page scrolls it takes the solid ground of the section under it, with a 1px line beneath. It holds the mark and wordmark on the left, centred links, and a sound toggle and small Pre-order pill on the right. The mark's arc and dot light in the mode's colour while a mode is on.
- **Links:** Mona Sans 540 at 0.92rem, in soft ink, on pill hit areas. Hover and current are full ink. The current link gets a 1rem × 2px pill bar that scales in beneath it.
- **Mobile:** the links fold into a menu button that opens a sheet on the ground's colour.

### Notification (signature, depicted)
The noise. These are real apps' notifications: an iOS-style icon (the owner's glyph, from Simple Icons, on the owner's colours), the app's name in bold, a one-line message and "now", on a 1.15rem white card with the banner-float shadow. They land one at a time at slight tilts around the hero dial, `back.out` into place, each with a two-note chime panned by app: a few for each stretch of scroll, and never closer than 140ms apart however fast the page is flung. While shown they give a short buzz-rattle every 3.4s. When the zone reaches one it is blown outward from the dial with a blur. The footer states that app names and icons belong to their owners and that Cairn isn't affiliated.

### The Dial (signature)
Cairn Home, the Halo band, in Three.js/WebGL: 72 mm across and 48 mm tall, in turned titanium, Graphite by default. From the table up:
- a micro-suction pad: a stepped dark disc 31.6 mm in radius and 2.6 mm thick, with a sheen, under a shadowed neck, so the dial seems to hover over its own shadow;
- a body whose foot rolls under on a 4 mm fillet;
- a band of frosted glass. Unlit it is translucent: its alpha follows the facing angle (about 0.38 looking straight in, 0.96 at grazing edges), its shading is lighter at the middle, and a dark light-guide core shows behind it. While a mode is on the core glows in the mode's colour and the band becomes solid light, with tone mapping off so the colour shows as it is, and a tight and a wide bloom;
- the crown that turns: a smooth lip, a 180-ridge knurl (1.26 mm pitch, carried by normal and groove-shading maps rather than the mesh), and a thick rounded rim. As a ridge narrows on screen from about 12px to 5px, its normal relief fades out and the groove shading (a wide, dark groove) carries the ribbing; below about 2px even that gives way to plain turned metal;
- an inset white ceramic button with an engraved pointer line, which lights in the mode's colour.

**Material.** Both devices are turned titanium, never lacquered: anisotropy along the lathe profile over a very fine turned-line normal map, so highlights stretch into long soft streaks down the walls and radially across the flat faces, with no clearcoat. The edge breaks are polished (roughness 0.1). Sage and Chalk are thin coloured coats on the same metal; their edge breaks are cut through the coat to bare titanium (natural tint, metalness 1), so each shows thin lines of natural metal either side of the band. The ceramic top is a satin white glaze.

| Finish | Tint | Metalness | Roughness | Anisotropy | Swatch |
|---|---|---|---|---|---|
| Graphite (dark titanium, the hero finish) | #74757b | 1 | 0.36 | 0.6 | #6e6e74 |
| Natural (bare titanium) | #bcbab5 | 1 | 0.28 | 0.72 | #bab6af |
| Sage (a soft green coat) | #8c9689 | 0.72 | 0.34 | 0.6 | #929b8b |
| Chalk (a warm white coat, a step warmer than the ceramic) | #dcd8cf | 0.5 | 0.38 | 0.55 | #e2dcd1 |

`components/dial/materials.ts` (DeviceMaterials, the finishes, Pocket's model) and `studio.ts` (the studio environment and lights) are the one source for every scene that draws Home or Pocket.

The pointer turns clockwise like a volume knob, from half past seven at Off to half past four at Home. One transparent, fixed canvas draws every device, with an orthographic camera in CSS pixels. Each anchor gets its own device and directs its own shot: tilt, zoom, focus, an optional exploded view and an optional clip to the anchor's rounded box. Every device follows the live mode; no section pins a level. The default shot is low (about 15°). Inside pulls the dial apart into its parts: ceramic top, crown, detent ring, light band, board, battery and micro-suction base. Still renders at the same box stand in before WebGL loads; `scripts/render-stills.mjs` renders them from the live scene.

Cairn Pocket is the same family, low: a micro-suction pad, a titanium body with a soft foot, a 140-ridge knurled side and a rounded rim round an inset ceramic face with a tap mark. Devices shows it stuck to a wall.

### The Exploded View (signature)
Inside pulls the dial apart into its seven parts as the track scrolls: ceramic top, knurled crown, detent ring, light band, board and radio, battery and micro-suction base.
- **Names and callouts:** each name sits level with its part's edge. Where two parts are closer together than two names are tall, the names step apart (at least 14px), staying within the dial's box, so the callouts are straight level lines with at most a short elbowed jog (under 10° at 1280 wide). Each callout is a hairline from a small ring marker just off the part's edge, drawn on as the part separates. Where the gap between the dial and the names is under 56px (roughly 821–1100px wide) the lines are hidden and the names still sit beside their parts.
- **Picking a part:** pointing at a part, on the dial or by its name, picks it out: the part grows 4% and comes 5 mm forward (rising by the same amount on screen, so its line stays level), catching a thin neutral rim while the rest dim to 0.58; its name goes to full ink and its line brightens, with a glint running along it and a pulse on its marker, only once the line is fully drawn. A click or tap pins it, again unpins it, and Escape lets go. A pick shows only once the dial is well apart (it fades in from 35% to 60% apart), and a pinned part lets go when the view closes below 30%.
- **Keyboard:** the names are buttons in the tab order. Keyboard focus on a name always shows it, picks its part out, and on wide screens scrolls the view to its nearest fully open point.
- **Phones:** the names are a plain list with rules between them; a tap still picks the part out on the dial, and the picked name keeps to the rules' edge.

### The House (signature, depicted)
How's 3D house has its own canvas, which starts only as the section nears the viewport and runs only while it's on screen; the model and its baked light are built in a worker, so the page keeps scrolling meanwhile. It is a cutaway of a lived-in flat on an evening (bedroom, study, kitchen, hall and living room), with walls cut at 70% of a storey: oak floors, walnut furniture, rugs, cushions, books and plants, tiled splashbacks, warm lamps with soft pools, and a dusk sky in the windows. Cairn Home sits on the study desk.
- **Scale:** the phones are drawn about twice life size, so each lies on a pillow, a sofa cushion or the island beside the fruit bowl as a phone would. Each screen shows a lock-screen clock and two notification cards. Cairn Home on the desk is drawn a little larger than that again, as the hero.
- **The zone:** light in the mode's colour that floods out from the dial across the floor and walks round walls, room by room. Desk lights the desk, Room fills the study and stops at its doorway, and Home floods the whole flat. It never goes beyond the walls: where it meets one it washes up the inner face, the wall's cut top glows as a crisp line in the mode's colour, and outside, the plinth and the ground never light. As the zone widens, materials keep more of their own colour and the lamps keep more of their pools, so under Home the oak, rugs and fabric stay themselves in clearly violet light. Desk and Room keep a strong contrast between lit and unlit.
- **Ripples:** while a mode is on, ripples run out from the dial as thin bright bands, about one every 1.5s at the least. Each flares the wall's cut top as it reaches it, so the pulse visibly meets the walls.
- **Turning up to Home from Desk or Room:** the new colour first washes the study out from the dial. The light waits at the study's doorway until the study has turned, then pours through it room by room already in Home's colour.
- **Phones:** screens glow and light what they lie on: lit with notifications while unguarded, and in the mode's colour with a lock once the zone holds them. Their crisp DOM pins show real apps' notifications with Signal Red badges, then locks lit in the zone's colour.
- **Labels:** labels ride the canvas and keep off the phones' pins. Each sits on its own side while that is clear; otherwise it moves to the other side of its lead or straight up (Cairn Home's goes up on a tall hairline, over the pins round the desk). A label may brush a pin's card but never covers a phone, and with nowhere clear it hides. During the walk, Cairn Home's label gives way to the walker's while they overlap. A pin that would cross the frame edge hides rather than be cut off.
- **The walk:** in the last step a figure walks from bed to the dial and turns it down. A readout pill gives the mode, its Doto range and how many phones are locked.

### Pocket's Story (signature)
Cairn Pocket's scroll story, in a Three.js canvas of its own that starts as the section nears and draws only while on screen and only when something has changed. The stage holds still while the track scrolls, and the scroll plays one progress value: the disc arrives and turns to show its ceramic face; a phone comes down, buzzing with four real apps; it taps the disc, a ripple spreads in the plane of the disc's face and the phone goes quiet; the disc turns over to show the copper coil behind its suction pad (no battery); and it rises onto a hallway wall beside the front door. The words change with it, one beat at a time.
- **Light:** Pocket is lit by the page's shared studio at its night values, with the ceramic lifted 0.2 as the shared stage does at night, so the visitor's finish looks the same here as in Give it a tap and Inside. As the hallway comes up, the studio lights fade to a faint rim and a warm downlight.
- **The tap:** the phone always stands in front of the ripple's plane, so rings pass behind it and never cross its screen. After the tap the phone stays on the disc for 0.45s and eases back over 0.35s, timed from the tap, so a flick straight past it still shows the touch; the buzz and the ripple also play in time rather than on scroll.
- **Reduced motion, a lost WebGL context or no scripts:** the same story told once, the words in order beside one composed frame of the end (`public/stills/pocket-door.webp`).

### Give It A Tap (signature)
Pocket, to try. It is stuck on the story's hallway wall (a still rendered from its scene without the door's lever, `public/stills/pocket-wall.webp`, and a tall crop for phones), and a drawn phone rests across the room. Drag the phone onto Pocket, tap the phone, or press the "Tap to lock" pill: the phone is carried over, presses to the disc, and the tap lands with a ripple spreading on the plaster (stopping at the door's frame), the tap's two notes and a 6ms buzz you can feel; the phone's lock screen goes quiet, its apps locked in the lock's colour. Pressing again unlocks. A press while the phone is out queues one more tap (it lifts off and taps again); a press while it's coming back turns it round. The status line is just "Locked." or "Unlocked.", its dot filled with the lock's colour while locked; the lede carries the walk back to the door, once. The phone lets vertical swipes through, so a swipe that starts on it still scrolls.

### Share Control
TimeBack's "How much of it you'd lock away": A quarter / Half / Most (three quarters).
- **Style:** a pill track in the tile tone, with a sliding pill thumb in the ground's ink. It isn't a mode, so it behaves like the hero's control at Off. Labels are 0.95rem 620 at wdth 104, in ink on the thumb.
- **Build:** native radios in a labelled radiogroup, with the focus ring on the pill. On phones and any touch screen the segments are at least 44px tall.
- The Mode Control stays the only segmented control that takes a mode colour.

### Time Back
The visitor's own arithmetic, both ways. The hours slider (the dial seen from above) sets the hours a day on the apps they'd lock, and the share control how much of that they'd hand to Cairn. Two big figures sit under the controls: the days a year on those apps in soft ink, and the days a year Cairn gives back in full ink, as the payoff. Each figure's caption leads with its key from the year. The year is a calendar of 365 dots: weeks run Monday to Sunday down 7 rows and it starts on a Thursday, so the first and last columns are part-weeks (4 days each on desktop). It is 53 columns sized from its own width with container-query units, folding to 27 fortnight columns × 14 rows at 640px and below. Every day on the apps wears a ring, and each day given back is also filled inside it, so the rings count the first figure and the fills the second. Big figures use proportional digits, because Mona Sans's tabular set slashes its zero. Only a phone (700px and below) stacks the two controls; from an iPad mini up each control stands over its figure. The figures scale with the smaller of the window's width and height, so a short laptop holds the whole board in one screen.

### The App (signature, depicted)
A four-tab iOS 26 app (Today, Apps, Schedules, Insights) on a drawn Black Titanium iPhone Pro, with a floating Liquid Glass tab bar, set in Mona Sans at iOS sizes. The mode tints it through `--tint`, `--tint-fill` and `--zone`: switches, the selected segment, rings, schedule blocks and chart bars take the dial's colour, and picking a mode in the app turns the page's dial (both follow one store).
- **Scroll edge:** two stages, both under the inline title, fading in once content runs under the bar and running 26pt past the 106pt bar: a 4px blur carrying a wash of the screen's background that steps from 1 to 0 on an eased ramp, then a 12px blur gone by 90%, so text passing under the title is only a haze. The title keeps at least 7.5:1 over the darkest card.
- **Lists:** an inset group rounds its first and last visible rows, so a group that ends in a hidden row (the unlock confirmation) still closes with 26pt corners.
- **Tab bar lens and Mode thumb:** placed with `translate`, never `transform`, so a press's `scale` lifts them where they sit. The lens grows from the side nearer the bar's middle, settles into an end tab on a firm spring (damping 0.86), and never leaves the capsule.
- **Handset:** the rail is lit from the upper left, with a narrow glint on the top-left corner curve and a dimmer one on the bottom-right, a 0.5px outer chamfer, and a groove shadow from the glass onto the rail's inner edge. The buttons are lighter than the rail, the right-hand ones dimmer. The cover glass carries a faint reflection (`--ios-glare` 0.11) that drifts with page scroll and holds still under reduced motion.
- Its iOS values (greys, separators, glass, radii, the titanium rail and the springs `--ios-spring`, `--ios-spring-loose` and `--ios-spring-firm`) are `--ios-*` custom properties declared on the phone.

### Motion
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` for nearly everything, and `cubic-bezier(0.65, 0, 0.35, 1)` for symmetric moves.
- **Detents:** the dial's angle is damped to the detent (quicker while dragging), each step plays a tick and a 6ms vibration on touch, and numbers travel on a spring (stiffness 170, damping 22).
- **The turn:** a small wind-up (to 95% at Desk, 98% after), then the dial punches forward to its zoom. Desk uses `elastic.out(1, 0.55)` over 1.1s; later detents use expo-out over 0.8s. The colour burst behind it scales from 0.2 to 2.4 (1.9 after Desk) and fades.
- **Noise:** notifications arrive one at a time, at least 140ms apart, with `back.out(1.6)` over 0.7s and a chime; they buzz every 3.4s, and are swept out over 0.85s with expo-out. Going back they leave in reverse, 70ms apart. The first click up waits for the last to land and holds the crowd 450ms; detents then come at least 480ms apart.
- **Reveals:** section titles split into lines that rise from 112% under a mask, over 1.15s with expo-out and a 0.09s stagger, once, at 86% of the viewport. A title already on screen at load is left alone. The Statement lights word by word on scroll, from as it enters to a little before its centre reaches the window's centre; each word rises 0.08em and sharpens from a 0.016em blur as it comes up from 0.38 opacity.
- **Time back:** the figures count up from zero on a softer spring (stiffness 70, damping 17), starting just before they rise into view, so no frame on screen reads zero; once the visitor touches a control they use the standard spring (170 / 22). The year has its own slower springs, 60 / 16 on arrival (once its top rows are in view) and 90 / 19 on changes, and a dot flips as its spring passes it, so a change sweeps across the grid as a wave. Rings draw in over 320ms; a given-back fill grows from the dot's centre over 420ms on the ease-out curve (painted with the dot as a radial gradient on a registered number, not a scaled layer). Each slider step and share change plays the detent click and a 6ms buzz.
- **Pocket:** the story is scrubbed by scroll (0.6s smoothing); the tap's hold, ripple and buzz run on time. In Give it a tap the phone reaches the disc in 520ms (180ms from a drag), holds 650ms and goes back in 720ms.
- **Scroll:** Lenis smooth scroll on fine pointers (lerp 0.11), synced to ScrollTrigger.
- **Reduced motion:** no smoothing, reveals, magnet, buzz or walk, and native scrolling. The hero is one still composition at Home, the Statement is fully lit, the house holds one still frame at Room, Pocket's story is told once beside a still, Give it a tap moves the phone without travel, and the time-back figures and year show their real numbers at once, never empty.

## Do's and Don'ts

### Do:
- **Do** declare every section's ground with `data-theme` (day, mist or night) and let the ink, lines, tiles, button and focus follow from it.
- **Do** give each mode its colour (Desk #ffa53d, Room #ff4d6d, Home #7555ff) and read it through `var(--mode, var(--accent))`, with that mode's ink on top.
- **Do** deepen Home's violet toward ink where white text sits on it at small sizes.
- **Do** set headlines in Mona Sans 760 at wdth 116, and text at wdth 100; keep Doto 800 for device readouts.
- **Do** make controls pills (999px) and containers tiles (1.75rem) separated by tone, with 1.5px inset rings for edges.
- **Do** give every turn of the dial a detent: a stepped angle, a tick, and a spring settle.
- **Do** show the real product in its WebGL anchor, lit by the studio, rather than a flat render.
- **Do** mark depicted interfaces with `data-depicted` and keep their values (iOS, real apps' brand colours) in their own files, outside the token scale.
- **Do** strip smoothing, reveals, magnet, buzz and the walk under `prefers-reduced-motion`.

### Don't:
- **Don't** use a mode colour for links, hovers, prices, emphasis, success messages or decoration.
- **Don't** show a mode's colour or glow while the dial is off, except the finish swatches' pip and Pocket's lock, which always show a colour and fall back to Desk's.
- **Don't** bring a real app's brand colour into Cairn's own UI; those colours belong to the noise.
- **Don't** introduce a second display face, or use Doto for headings or prose.
- **Don't** put a small uppercase label or eyebrow above section titles; titles stand alone.
- **Don't** give tiles or buttons drop shadows; shadows are for objects in the scene (notifications, pins, the phone, the toast, a knob).
- **Don't** cover the hero's buttons: the notifications land clear of the middle.
- **Don't** hard-code a ground's colour inside a component; read it from the theme.
