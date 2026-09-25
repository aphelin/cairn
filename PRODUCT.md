# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (user's choice) with a static export, Three.js and GSAP (user's requirement). Images come from FAL (Nano Banana 2). Videos are allowed, but only after the user confirms each video job. Package manager: pnpm. Hosting is open (static-friendly, for example Vercel or Netlify).

## Users

- **Primary, real:** tech interviewers and hiring managers looking at the author's portfolio. They open a shared link for a short time, usually on a desktop browser and sometimes on a phone, and decide quickly whether the author has frontend craft. They're often engineers, and most of them fight their own phone habits.
- **Fictional, in-story:** people who want their attention back from their phone. They're students, remote workers and parents, and they have tried screen-time settings and turned them off again. The copy speaks to them.

## Product Purpose

A launch website for **Cairn**, a fictional brand of small smooth stones that lock the distracting apps on your phone. You adjust them through a free companion app. The site is a portfolio piece. Success means an interviewer is impressed within the first seconds, plays with the page, recognises the problem as their own, and remembers the site afterwards.

## Positioning

Built-in screen-time settings fail because turning them off costs one tap. Cairn puts the "off switch" in the physical world, so breaking the habit takes getting up and walking over. The page demonstrates the promise instead of describing it: a noisy, buzzing phone goes quiet when it meets the stone.

The category is real, and Cairn is a fictional entry in it:
- Brick is a $59 NFC puck: tap your phone on it to block apps.
- ScreenZen's Halo is a $49 Bluetooth device that blocks apps within a set radius.

Cairn's difference is two stones for two situations, a pocket stone you tap and a home stone that guards a room, run by one app.

## Operating Context

- Viewed from a link in a CV, portfolio or message, often during or before an interview, sometimes shared with colleagues.
- Must work well on desktop (mouse) and phone (touch). Many visitors will be on the very device the product is about.
- Interviewers may open devtools, run Lighthouse, try the keyboard, or resize the window.

## Capabilities and Constraints

- A single long landing page with everything a real product launch page has:
  - both models and their colours;
  - how it works;
  - an interactive look at the app;
  - what's in the box;
  - compatibility;
  - a comparison;
  - reviews;
  - FAQ;
  - pre-order;
  - contact.
- **Product line** (user's answers, reconciled; revisable):
  - **Cairn Pocket:** tap your phone on the stone to lock the apps you chose, and tap again to unlock. It uses NFC and needs no battery. $49.
  - **Cairn Home:** apps stay locked while the phone is within a set distance of the stone, such as a desk or a bedroom. It uses Bluetooth with an adjustable radius and a replaceable battery. $49.
  - Each model comes in four colours. The colour names and palette are decided in the design work.
  - A pair costs $88: any two stones, including one of each model.
  - The companion app is free, with no subscription.
- **App capabilities, proposed and fictional:**
  - choose the apps and websites to lock;
  - schedules, such as work hours and bedtime;
  - daily limits;
  - a lock mode that stops you from uninstalling the app to escape;
  - a small number of emergency unlocks each month.
- Pre-order, newsletter and contact forms are demo-only. They validate and show a success state, but send nothing. There is no real checkout, cart or payment.
- Images come from FAL Nano Banana 2. The key lives in `.env` as `FAL_KEY` and must never be committed or shipped to the client. Video generation runs only after the user explicitly confirms it.

## Brand Commitments

- Name: **Cairn**.
- The site states clearly (at least in the footer) that Cairn is a fictional concept and that nothing ships.
- Cairn must not imitate Brick, ScreenZen/Halo or any real company's name, branding, product shape or copy. Real products may be named only as factual context, if at all.
- Author credit: the same as Nightbloom ("Aphelin", github.com/aphelin) unless the user changes it before deploying.

## Evidence on Hand

None. There are no real customers, reviews, press, test results or photos. Reviews on the page are part of the fiction and must be labelled fictional. Any real-world statistic, such as average daily screen time, needs a cited, verifiable source or must be left out. Numbers the visitor computes for themselves, such as time saved per year from their own input, are fine.

## Product Principles

1. **The page is the demo.** Visitors feel the noise go quiet through interaction instead of being told about it.
2. **Obvious at a glance.** One sentence explains the product, and no science or setup is needed.
3. **Few words.** One idea per screen. The visitor should never get lost in text.
4. **Craft is the proof.** Smooth motion, fast loading, accessibility and responsive behaviour are part of the pitch, because interviewers will inspect them.
5. **Complete, like a real launch page.** Every section a real product page would have is present and finished.

## Accessibility & Inclusion

- Respect `prefers-reduced-motion`: show the calm end state and the finished product views instead of animation.
- All content and forms must be usable by keyboard and screen reader. The 3D canvas must never trap focus or hide content, and every drag interaction has a button equivalent.
- Text must meet WCAG AA contrast on every section colour.
- Touch input must work as well as a mouse does.
