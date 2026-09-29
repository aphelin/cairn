// Each mode has its own colour: the dial's light, the zone on the floor, the
// mode control, the 3D house and the app all take it, so the page changes
// colour as the dial turns. Off has none. Keep in step with the --mode-*
// tokens in app/globals.css (scripts/verify-design-docs.mjs holds them equal).
export const MODE_HEX = ["#ffffff", "#ffa53d", "#ff4d6d", "#7555ff"] as const;

// Text laid on each mode's colour.
export const MODE_INK = ["#0b0b0c", "#1c1000", "#23000a", "#ffffff"] as const;

export const modeVar = (level: number) => (level <= 0 ? "var(--fg)" : `var(--mode-${["", "desk", "room", "home"][Math.min(3, level)]})`);
