---
name: Cairn
description: An off switch, set in stone. The Waymark world, a marked trail in flat enamel fields.
colors:
  sign-yellow: "#f2c200"
  alpine-blue: "#1f5aa6"
  forest-green: "#1d5b3b"
  blaze-red: "#d7262b"
  chalk: "#f4f1e8"
  chalk-deep: "#e7e2d4"
  enamel-black: "#141414"
  white: "#ffffff"
  yellow-ink-2: "#3f3300"
  chalk-ink-2: "#4b4841"
  blue-ink-2: "#d3e1f5"
  green-ink-2: "#cfe5d6"
  black-ink-2: "#bcb7aa"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(3.4rem, 1.2rem + 5.4vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(2.4rem, 1.7rem + 2.8vw, 4.2rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(1.7rem, 1.35rem + 1.3vw, 2.6rem)"
    fontWeight: 700
    lineHeight: 1.1
  plate:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(1.05rem, 1rem + 0.22vw, 1.2rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.01em"
  numeral:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  lede:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 1.1rem + 0.55vw, 1.6rem)"
    fontWeight: 400
    lineHeight: 1.35
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "clamp(1.05rem, 1rem + 0.22vw, 1.2rem)"
    fontWeight: 400
    lineHeight: 1.5
  fine:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "clamp(0.84rem, 0.8rem + 0.15vw, 0.94rem)"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  enamel: "0"
  device-sm: "0.7rem"
  tile: "0.9rem"
  device-md: "1rem"
  phone: "2.6rem"
  dot: "50%"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
  "7": "3rem"
  "8": "4.5rem"
  "9": "7rem"
  gutter: "clamp(1.25rem, 0.4rem + 3.4vw, 4.5rem)"
  section: "clamp(5rem, 3rem + 6vw, 9rem)"
components:
  plate-arrow-on-light:
    backgroundColor: "{colors.enamel-black}"
    textColor: "{colors.sign-yellow}"
    typography: "{typography.plate}"
    rounded: "{rounded.enamel}"
    padding: "0.55em 1.75em 0.55em 1.1em"
    height: "3rem"
  plate-arrow-on-dark:
    backgroundColor: "{colors.sign-yellow}"
    textColor: "{colors.enamel-black}"
    typography: "{typography.plate}"
    rounded: "{rounded.enamel}"
    padding: "0.55em 1.75em 0.55em 1.1em"
    height: "3rem"
  plate-square:
    textColor: "{colors.enamel-black}"
    typography: "{typography.plate}"
    rounded: "{rounded.enamel}"
    padding: "0.55em 1.1em"
    height: "3rem"
  location-plate:
    backgroundColor: "{colors.white}"
    textColor: "{colors.enamel-black}"
    rounded: "{rounded.enamel}"
    padding: "0.3rem 0.9rem 0.3rem 0.7rem"
    height: "2.6rem"
  nav-plate:
    backgroundColor: "{colors.sign-yellow}"
    textColor: "{colors.enamel-black}"
    typography: "{typography.plate}"
    rounded: "{rounded.enamel}"
    padding: "0.55rem 1.5rem 0.5rem 0.8rem"
    height: "2.6rem"
  nav-plate-on-yellow:
    backgroundColor: "{colors.enamel-black}"
    textColor: "{colors.sign-yellow}"
  time-label:
    backgroundColor: "{colors.sign-yellow}"
    textColor: "{colors.enamel-black}"
    typography: "{typography.plate}"
    rounded: "{rounded.enamel}"
    padding: "0.2rem 0.55rem"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.enamel-black}"
    typography: "{typography.body}"
    rounded: "{rounded.enamel}"
    padding: "0.7rem 0.9rem"
    height: "3.25rem"
  stepper-button:
    backgroundColor: "{colors.enamel-black}"
    textColor: "{colors.sign-yellow}"
    rounded: "{rounded.dot}"
    size: "2.75rem"
  app-tile:
    backgroundColor: "{colors.white}"
    textColor: "{colors.enamel-black}"
    rounded: "{rounded.tile}"
    padding: "0.6rem 0.2rem 0.5rem"
  app-tile-locked:
    backgroundColor: "{colors.chalk-deep}"
  compare-cairn-column:
    backgroundColor: "{colors.sign-yellow}"
    textColor: "{colors.enamel-black}"
    typography: "{typography.plate}"
---

# Design System: Cairn

## Overview

**Creative North Star: "Waymark"**

The page is a marked trail back to your attention. Every section is one flat field painted in a trail-marking colour, drenched edge to edge: sign yellow, alpine blue, forest green, chalk, and a black enamel footer. The furniture of the page is the furniture of a trail: signpost plates are the nav, the buttons and the labels; a white-red-white blaze stripe runs down the left edge as the wayfinding spine; contour survey lines are the only ornament. A matte stone, rendered in real 3D, travels the trail from section to section and rests on each waypoint.

Density is low and loud. A section carries one condensed headline, one lede, and one working object (a table, a phone, a form, a stone), set on a single ground with nothing layered behind it. Colour does the sectioning, so there are no dividers between sections, no cards floating on a neutral canvas, and no gradients. Motion is physical: damped springs, outward displacement, a stone that squashes on contact. Things are pushed off the page; nothing fades away to make room.

The world rejects the white-and-grey gadget page with phone mockups on soft gradients. The phones that appear here are working objects that sit on a drenched field, not hero renders on a glow.

**Key Characteristics:**
- One flat ground per section, with ink, plates and focus colour derived from that ground.
- Blaze red is a signal, never a fill: you are here, the active choice, the field error.
- Barlow Condensed for everything read as a sign; open Barlow for sentences.
- Arrow plates point where they take you; a plate you have passed points back.
- Square enamel for sign elements; rounding belongs only to devices and the stone.
- Contour linework is the only ornament; the 3D stone is the only hero object.

## Colors

A trail-marking palette: four drenched grounds, one enamel black, and one reserved signal red.

### Primary
- **Sign Yellow** (sign-yellow): the brand ground. It paints the hero, the time-back section and the pre-order section, and it is the plate colour on every dark ground (blue, green, black). It also marks Cairn's own column in the compare table, the reading-time labels and the "Locked" state on the phone.

### Secondary
- **Alpine Blue** (alpine-blue): a full ground for the stones, box and contact sections. On chalk it is the focus colour.
- **Forest Green** (forest-green): a full ground for the colours and reviews sections. In the app demo it also colours the trend line when a number drops.

### Tertiary
- **Blaze Red** (blaze-red): the trail's own mark. It appears only as a small circle with a 2px white ring (the nav's you-are-here dot, the selected colour swatch, the field-error dot), as an input's invalid border, and as the centre band of the white-red-white blaze spine.

### Neutral
- **Chalk** (chalk): the quiet ground for how-it-works, the app demo, compare, FAQ and the doorway, and the pre-order sheet laid on yellow.
- **Chalk Deep** (chalk-deep): app icon wells and the locked app tile; the scrollbar track.
- **Enamel Black** (enamel-black): ink on yellow and chalk, plates on yellow and chalk, the phone body, and the footer ground.
- **White** (white): ink on blue and green, the location plate, inputs on dark grounds, the blaze stripe's outer bands, and the ring around every blaze dot.
- **Secondary inks** (yellow-ink-2, chalk-ink-2, blue-ink-2, green-ink-2, black-ink-2): each ground's quieter text colour for ledes, captions and fine print. Each one is tinted toward its own ground, never a neutral grey.

Each ground also derives a hairline rule and a contour ink from its main ink at low alpha: 0.2 to 0.3 alpha for rules and 0.1 to 0.16 alpha for contours.

### Named Rules
**The Drenched Ground Rule.** A section declares exactly one ground, and that ground fills it edge to edge. Its ink, secondary ink, rule, contour, plate, plate ink and focus colour all follow from the ground. A section never mixes grounds, tints them, or blends them into a gradient.

**The Blaze Rule.** Blaze red means "you are here", "this is the one you picked", or "this field needs you". It is never text, never a button fill, never a section colour, and never decoration.

**The Ground Owns Its Plates Rule.** On yellow and chalk, plates are black with yellow type. On blue, green and black, plates are yellow with black type. A plate never repeats its own ground colour.

## Typography

**Display Font:** Barlow Condensed 600 and 700 (with Arial Narrow, sans-serif)
**Body Font:** Barlow 400, 500 and 600 (with system-ui, sans-serif)

**Character:** Barlow descends from highway and trail signage. The condensed cut is the enamel sign: headings, plates, numerals, field labels. The open cut carries every sentence at an easy reading size.

### Hierarchy
- **Display** (700, clamp(3.4rem, 1.2rem + 5.4vw, 6rem), 0.9): the hero headline only, set as two block lines. The footer's closing line uses the same voice at clamp(3rem, 1.2rem + 7vw, 7.5rem).
- **Headline** (700, clamp(2.4rem, 1.7rem + 2.8vw, 4.2rem), 0.95): section titles, capped at 14ch and balanced.
- **Title** (700, clamp(1.7rem, 1.35rem + 1.3vw, 2.6rem), 1.1): step headings in how-it-works and the FAQ questions.
- **Plate** (700, clamp(1.05rem, 1rem + 0.22vw, 1.2rem), 1.1, 0.01em): all plate text, the compare table head, and reading-time labels. Field labels use the same face at 600.
- **Numeral** (Barlow Condensed 700, tabular figures): the phone clock, stepper values, app counts, and every spring-driven number.
- **Lede** (400 to 500, clamp(1.25rem, 1.1rem + 0.55vw, 1.6rem), 1.35): one per section in the ground's secondary ink, capped at 30 to 34ch.
- **Body** (400, clamp(1.05rem, 1rem + 0.22vw, 1.2rem), 1.5): running text. FAQ answers are capped at 52ch.
- **Fine** (400 to 600, clamp(0.84rem, 0.8rem + 0.15vw, 0.94rem)): notes, field errors, footer fine print capped at 70ch.

### Named Rules
**The Two Barlows Rule.** If it is read as a sign (a heading, a plate, a label or a number), it is set in Barlow Condensed. If it is read as a sentence, it is set in Barlow. There is no third face.

**The Sentence-Case Sign Rule.** Signs are set in sentence case with near-zero tracking. The system has no uppercase, letter-spaced label style, and no label line sits above a heading.

## Layout

Sections stack full-bleed, each with vertical padding (spacing.section) and side padding (spacing.gutter). Content sits in a 1320px column; the nav row caps at 1440px. The nav is a fixed 4rem row whose strip takes the colour of the ground beneath it, so words never scroll under the plates. The blaze spine is fixed on the gutter's midline, 0.5rem wide on desktop and 0.3rem at 980px and below. It runs from under the nav to the bottom of the viewport, with a black waypoint post that walks down it as you scroll.

Compositions are asymmetric two- or three-column grids with generous gaps (clamp up to 7rem to 8rem). Examples are the hero's left-third copy against the right two thirds of stage, the FAQ's sticky title beside its list, and the app demo's phone flanked by pointing note plates. The hero is a 210svh sticky track, so the quiet can be scrubbed by scroll.

Breakpoints as built:
- **980px:** the route plates collapse into a menu panel.
- **900px:** the FAQ and app demo grids stack.
- **820px:** the travelling stone gives way to one stone per anchor, and the colours grid stacks.
- **560px:** the compare table tightens.

## Elevation & Depth

The enamel is flat. Grounds, plates, tables, swatches and inputs carry no shadow; hierarchy comes from ground colour and type weight. Depth exists only where a physical object sits on the field: the phone, the notification banners, the stone chips, and the chalk pre-order sheet laid on yellow. The 3D stone gets its depth from real lighting in WebGL. Its stills in public/stills are renders from the same scene.

### Shadow Vocabulary
- **Device drop** (`0 24px 40px -18px rgb(20 20 20 / 0.55)`; in the app demo, `0 40px 60px -30px rgb(20 20 20 / 0.5)`): phones, always paired with a 1.5px #3a3a3a inset bezel.
- **Banner lift** (`0 1px 2px rgb(20 20 20 / 0.1), 0 14px 28px -12px rgb(20 20 20 / 0.45)`): notification banners in the hero's noise.
- **Sheet drop** (`0 30px 60px -40px rgb(20 20 20 / 0.6)`): the pre-order form sheet.
- **Pebble shading** (`inset 0 -3px 6px rgb(0 0 0 / 0.25), 0 2px 4px rgb(0 0 0 / 0.25)`): colour chips shaped like stones.

### Named Rules
**The Enamel Is Flat Rule.** Anything that is a sign (a ground, plate, label, table or field) is flat. A shadow means that the thing is an object you could pick up.

## Shapes

Sign elements are square: plates, the location plate, inputs, swatches, the compare column and the pre-order sheet all have zero radius. Arrow plates are cut with a clip-path polygon into a flat pointed sign, with a tip of about 0.8 to 0.9em. A forward plate points right. A nav plate for a section you have passed flips to point back. App demo note plates point at the part of the phone they name. Rounding is reserved for devices: the phone (2.6rem body, 2.1rem screen), notification banners (1rem), app tiles (0.9rem), icon wells (0.7rem), and switches. Signal dots and stepper buttons are true circles. The stone and its colour chips use an organic pebble radius (48% 52% 46% 54% / 58% 55% 45% 42%). Contour lines appear three ways: the hero's canvas rings, the Home model's dashed and solid range ellipses, and the generated contours.svg used as a mask, always in the ground's own contour ink.

**The Square Enamel Rule.** A sign has corners. If an element is rounded, it must be a device, a dot or a stone.

## Components

### Buttons (Signpost Plates)
Flat enamel signs that point where they take you.
- **Shape:** square with an arrow tip cut by clip-path (rounded.enamel); minimum height 3rem, or 3.4rem in the hero.
- **Arrow plate:** the ground's plate colour with plate ink, in Barlow Condensed 700. Its icon is an inline SVG at 1.1em.
- **Hover / Active:** it slides 0.3em toward where it points (260ms, ease-out) and presses to translateX(0.15em) scale(0.98).
- **Focus:** a clip-path hides an outline, so the wrapper draws a 3px four-way drop-shadow ring in the ground's focus colour.
- **Square plate:** for actions that stay on this page ("Tap to quiet"). It has no tip and a transparent fill, with a 2px inset border and text in the ground's secondary plate colour; hover fills it at 12%. It takes a normal 3px focus outline.
- **Disabled:** 0.45 opacity, no movement.

### Labels
- **Reading-time labels:** small square yellow plates in Barlow Condensed 700 under each how-it-works step, and walking times beside each nav plate at 0.85rem 600 tabular.
- **Pointing notes:** yellow arrow plates in the app demo. At 900px and below they lose their tips and stack.
- **In-range badge:** a black square plate with yellow text.

### Inputs / Fields
- **Style:** a 2px ink border with a square corner, a minimum height of 3.25rem, and a fill of the ground mixed 70% toward white. On dark grounds the input is solid white with a white border. Labels are Barlow Condensed 600.
- **Focus:** a 3px ring in the ground's focus colour, drawn as a box-shadow.
- **Error:** the border turns blaze red with a 1px blaze ring, and the message below starts with a blaze dot ringed in white.

### Navigation (The Signpost)
- **Style:** no bar and no slab. A white square location plate "Cairn", ringed with a 2px black inset, sits at the left. Arrow plates for each section run to the right, each with its walking time, and sound and menu buttons are white square plates.
- **States:** plates are yellow on every ground except yellow, where they turn black. The current section's plate carries the blaze you-are-here dot, and passed plates point back. Hover slides a plate 0.2rem in its pointing direction, and focus turns it white.
- **Mobile:** at 980px and below the route collapses into a right-aligned stack of 3rem plates behind a menu plate.

### Controls
- **Steppers:** circular 2.75rem buttons, black with yellow icons in the app demo and outlined in 2px black on the pre-order sheet. Values are tabular Barlow Condensed and move on a damped spring.
- **Switches:** a 3.1rem track, #cfc9ba when off and black when on, with a white knob that turns yellow when on and travels on the settle curve.
- **Swatches:** square cells with a 2px white border at 35% that turns yellow when picked. The picked swatch gains a blaze dot.
- **FAQ:** native disclosure rows on 1.5px hairline rules, questions at Title size, and a yellow square icon that rotates 45 degrees on open.
- **Compare table:** 1.5px hairline row rules. Cairn's column is a yellow plate running the full height of the table, in Barlow Condensed 700.

### Signature: The Stone and the Quiet
One fixed WebGL canvas holds the stone and chains it through ordered anchors down the page. On each glide it rests for 28% of the travel at either end, and it jumps instead of gliding across gaps longer than 2.2 viewports. At 820px and below each anchor renders its own stone. In the hero a buzzing phone meets the stone by drag, button, keyboard or scroll. On contact the stone squashes and springs back, a contour front spreads outward and physically displaces every notification banner off the field, and the rings remain as a map. With reduced motion the page starts in the quiet state. In the app demo, locking an app drops a still render of the same stone onto its tile.

Motion vocabulary: the ease-out curve for state changes (160 to 300ms); the settle curve, which does not overshoot, for arrivals (300 to 700ms); and damped springs (stiffness 170, damping 22) for every computed number. A number the visitor changes directly, such as the daily limit, also shows a trend mark.

## Do's and Don'ts

### Do:
- **Do** give every section exactly one ground and derive its ink, plates and focus colour from that ground.
- **Do** set plates, headings, labels and numbers in Barlow Condensed 700, and sentences in Barlow 400 to 500.
- **Do** make every navigating plate point: right to go forward, back once passed.
- **Do** draw the focus ring in the ground's focus colour: black on yellow, alpine blue on chalk, sign yellow on blue, green and black.
- **Do** move numbers on damped springs, and show a trend mark where the visitor changes them; move arrivals on the settle curve without overshoot.
- **Do** push things off the page by displacement when the page goes quiet.
- **Do** carry provenance beside every shipped raster (the photo and stills each have a .json sidecar).

### Don't:
- **Don't** use blaze red for anything but you are here, the active choice, and a field error; never as text, a fill or decoration.
- **Don't** add ornament beyond contour linework, the blaze and the plates; no gradients, glows or textures on grounds.
- **Don't** round a sign element; rounding belongs to devices, dots and the stone.
- **Don't** put a shadow on a ground, plate, table or input.
- **Don't** set a plate in its own ground's colour.
- **Don't** put a label line above a heading or set signs in letter-spaced uppercase.
- **Don't** fade the noise out; displace it.
