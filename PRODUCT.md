# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (user's choice) with a static export, Three.js and GSAP (user's requirement: heavy, modern motion and micro-interactions). Images are generated through the user's Cursor subscription (`cursor-agent` driving Grok's GenerateImage, wrapped by `scripts/cursor-image.mjs`); FAL (`scripts/fal-image.mjs`) only when the user asks for it. Videos are allowed, but only after the user confirms each video job. Package manager: pnpm. Hosting is open (static-friendly, for example Vercel or Netlify).

## Users

- **Primary, real:** tech interviewers and hiring managers looking at the author's portfolio. They open a shared link for a short time, usually on a desktop browser and sometimes on a phone, and decide quickly whether the author has frontend craft. They're often engineers, and most of them fight their own phone habits.
- **Fictional, in-story:** people who want their attention back from their phone. They're students, remote workers and parents, and they have tried screen-time settings and turned them off again. The copy speaks to them.

## Product Purpose

A launch website for **Cairn**, a fictional brand of small machined devices that lock the distracting apps on your phone: a dial you turn and a disc you tap. You set them up through a free companion app. The site is a portfolio piece. Success means an interviewer is impressed within the first seconds, plays with the page, recognises the problem as their own, and remembers the site afterwards.

## Positioning

Built-in screen-time settings fail because turning them off costs one tap. Cairn puts the off switch in the physical world, so getting your apps back takes getting up and walking over. The page demonstrates the promise instead of describing it: a noisy, buzzing page goes quiet as you turn the dial.

The category is real, and Cairn is a fictional entry in it:
- Brick is a $59 NFC puck: tap your phone on it to block apps.
- ScreenZen's Halo is a $49 Bluetooth device, shaped like a pebble, that blocks apps within a set radius.

Cairn's difference is two machined objects for two situations, run by one app: a dial that guards a room at the radius you turn it to, and a disc you tap by the door.

## Operating Context

- Viewed from a link in a CV, portfolio or message, often during or before an interview, sometimes shared with colleagues.
- Must work well on desktop (mouse) and phone (touch). Many visitors will be on the very device the product is about.
- Interviewers may open devtools, run Lighthouse, try the keyboard, or resize the window.

## Capabilities and Constraints

- A single long landing page with everything a real product launch page has:
  - both models and their finishes;
  - how it works;
  - Cairn Pocket's own story, told on scroll in 3D, and a tap to try (added 2026-09-26: the page had been almost all about Home);
  - an interactive look at the app;
  - what's in the box;
  - compatibility;
  - a comparison;
  - reviews;
  - FAQ;
  - pre-order;
  - contact.
- **Product line** (decided with the user on 2026-09-25; revisable):
  - **Cairn Home, the dial:** a solid cylinder of turned titanium, 72 mm across and 48 mm tall. Its top third is a crown with fine vertical knurling that turns through four detents: Off, Desk (about 1 m), Room (about 4 m) and Home (about 12 m). While a zone is on, the apps you chose stay locked on your phone while it's inside that radius, and the light between crown and body glows in that mode's colour. To get the apps back you leave the zone, or walk to the dial and turn it down. The top is white ceramic with an indicator dot. Bluetooth LE, and a replaceable battery that lasts about two years. Its base is a micro-suction pad, so it sticks to a desk, a shelf or a wall and peels off clean. $49.
  - **Cairn Pocket, the disc:** a low knurled titanium disc, 56 mm across and 14 mm tall, with the same white ceramic top. Tap your phone on it to lock the apps you chose, and tap again to unlock, so it lives somewhere you have to walk to, like the hallway. NFC, and no battery. Its back is a micro-suction pad, so it sticks to walls and ceilings as well as tables. $49.
  - Each model comes in four titanium finishes (revised 2026-09-26, when the user asked for a premium metal instead of the rubbery, pebble-like look):
    - **Graphite:** dark titanium, the hero finish.
    - **Natural:** bare titanium, a warm light grey.
    - **Sage** and **Chalk:** thin coloured coats on the same turned titanium. Their polished edge breaks are cut through the coat to bare titanium, so each has thin lines of natural metal either side of the band. Chalk is a warm cream white, a step warmer and darker than the white ceramic top.
  - A pair costs $88: any two devices, including one of each model.
  - The companion app is free, with no subscription and no account.
- **App capabilities, proposed and fictional:**
  - choose the apps and websites to lock;
  - schedules, such as work hours and bedtime;
  - daily limits;
  - a lock mode that stops you from uninstalling the app to escape;
  - a small number of emergency unlocks each month.
- Pre-order, newsletter and contact forms are demo-only. They validate and show a success state, but send nothing. There is no real checkout, cart or payment.
- Secrets (the FAL key in `.env`) must never be committed or shipped to the client. Video generation runs only after the user explicitly confirms it.

## Brand Commitments

- Name: **Cairn**.
- **No stones, pebbles or stacked-stone marks, anywhere.** The first build was a pebble with a three-stone logo, which the user rejected on 2026-09-25 as a copy of ScreenZen (a stacked-stone logo, and a pebble-shaped Halo). The product and the brand are machined and designed, not found in nature. The logo is Cairn's own.
- **Modern, not retro.** On 2026-09-25 the user chose the category standard, a modern gadget launch page, over hi-fi, theatre and studio-meter worlds, which they called old-fashioned. The craft bar is Apple's product pages (AirPods Pro, AirTag) and Nothing's, with GSAP and Three.js motion, scroll-driven 3D and micro-interactions throughout.
- The site states clearly (at least in the footer) that Cairn is a fictional concept and that nothing ships.
- Cairn must not imitate Brick, ScreenZen/Halo or any real company's name, branding, product shape or copy.
- **Real apps as the noise** (the user's decision, 2026-09-25, round 2). The notifications and the app demo show real apps by their own names and icons: YouTube, TikTok, Instagram, WhatsApp, Snapchat, X, Reddit, Netflix and Discord. They appear only to depict the pull Cairn turns down. The footer says the names and icons belong to their owners and that Cairn isn't affiliated. Cairn never borrows their look for itself.
- **A colour for each mode** (the user's decision, 2026-09-25, round 2). Desk, Room and Home each have their own colour. The dial's light, the zone, the mode control, the 3D house and the app all take the current one, so the page changes colour as the dial turns. This replaces the round-1 rule of a single amber accent.
- Author credit: the same as Nightbloom ("Aphelin", github.com/aphelin) unless the user changes it before deploying.

## Evidence on Hand

None. There are no real customers, reviews, press, test results or photos. Reviews on the page are part of the fiction and must be labelled fictional. Any real-world statistic, such as average daily screen time, needs a cited, verifiable source or must be left out. Numbers the visitor computes for themselves, such as time saved per year from their own input, are fine. The time-back numbers come from two inputs the visitor sets: the hours a day on the apps they'd lock, and how much of that they'd lock away with Cairn (a quarter, half or three quarters). The page shows both what the apps take and what Cairn gives back: days a year = hours × 365 / 24, and days back = that × the share. No outside statistic is used.

## Product Principles

1. **The page is the demo.** Visitors turn the dial and feel the noise go quiet, instead of being told about it.
2. **Obvious at a glance.** One sentence explains the product, and no science or setup is needed.
3. **Few words.** One idea per screen. The visitor should never get lost in text.
4. **Craft is the proof.** Smooth motion, fast loading, accessibility and responsive behaviour are part of the pitch, because interviewers will inspect them.
5. **Complete, like a real launch page.** Every section a real product page would have is present and finished.

## Accessibility & Inclusion

- Respect `prefers-reduced-motion`: show the calm end state and the finished product views instead of animation.
- All content and forms must be usable by keyboard and screen reader. The 3D canvas must never trap focus or hide content, and every drag interaction has a button equivalent.
- Text must meet WCAG AA contrast on every section colour.
- Touch input must work as well as a mouse does.
