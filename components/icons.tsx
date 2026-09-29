// One icon family: 24px grid, 1.75 stroke, round joins. Drawn for this page.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (props: P) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
  ...props,
});

export const Arrow = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const SoundOn = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  </svg>
);

export const SoundOff = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" />
    <path d="m16 9.5 5 5M21 9.5l-5 5" />
  </svg>
);

export const Lock = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="10.5" width="14" height="10" rx="1.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

export const Check = (p: P) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const Cross = (p: P) => (
  <svg {...base(p)}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </svg>
);

export const Plus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Minus = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);

export const Menu = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 8.5h16M4 15.5h16" />
  </svg>
);

// A person walking: the only way to undo a lock.
export const Walk = (p: P) => (
  <svg {...base(p)}>
    <circle cx="13.5" cy="4.5" r="1.8" />
    <path d="m9 21 2.5-6.5 3 3V21M8 12l3-4.5 3.5 1 2.5 3.5M11.5 7.5l-1 5 4 2" />
  </svg>
);

// A phone meeting Pocket: the tap.
export const Tap = (p: P) => (
  <svg {...base(p)}>
    <rect x="7" y="2.5" width="10" height="15" rx="2" />
    <path d="M5 20.5c2 1 12 1 14 0M3.5 17.5c1 .8 2 1.3 3.5 1.6M20.5 17.5c-1 .8-2 1.3-3.5 1.6" />
  </svg>
);

export const TrendDown = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7l6 6 3.5-3.5L20 16" />
    <path d="M20 11v5h-5" />
  </svg>
);

export const Signal = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable={false} {...p}>
    <rect x="3" y="14" width="3.2" height="6" rx="0.8" />
    <rect x="8.2" y="11" width="3.2" height="9" rx="0.8" />
    <rect x="13.4" y="8" width="3.2" height="12" rx="0.8" />
    <rect x="18.6" y="5" width="3.2" height="15" rx="0.8" />
  </svg>
);

export const Battery = (p: P) => (
  <svg viewBox="0 0 28 24" fill="none" aria-hidden focusable={false} {...p}>
    <rect x="1.5" y="6.5" width="22" height="11" rx="3" stroke="currentColor" strokeWidth="1.5" />
    <rect x="4" y="9" width="13" height="6" rx="1.2" fill="currentColor" />
    <path d="M25.5 10.5v3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

// App glyphs for the invented apps in the demo.
export function AppGlyph({ name, ...p }: P & { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    chirp: <path d="M5 16c4 0 6.5-2 7.5-5.5L14 6l3.5 1.5L20 7l-2 2.2c0 5.3-4 9.3-9.5 9.3-1.6 0-3-.5-3.5-2.5Z" />,
    reels: (
      <>
        <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
        <path d="m10.5 9.5 4.5 2.5-4.5 2.5v-5Z" />
      </>
    ),
    chat: <path d="M4.5 6.5h15v9h-8l-4.5 3.5v-3.5H4.5v-9Z" />,
    news: (
      <>
        <rect x="4" y="4.5" width="16" height="15" rx="1.5" />
        <path d="M7.5 8.5h9M7.5 12h9M7.5 15.5h5" />
      </>
    ),
    shop: (
      <>
        <path d="M5.5 8.5h13l-1 11h-11l-1-11Z" />
        <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
      </>
    ),
    stream: (
      <>
        <rect x="3.5" y="5.5" width="17" height="11" rx="1.5" />
        <path d="M9 20h6" />
      </>
    ),
    mail: (
      <>
        <rect x="3.5" y="6" width="17" height="12" rx="1.5" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    game: (
      <>
        <path d="M7 8.5h10a4 4 0 0 1 3.9 4.9l-.8 3.2a2 2 0 0 1-3.4.9L14.5 15h-5l-2.2 2.5a2 2 0 0 1-3.4-.9l-.8-3.2A4 4 0 0 1 7 8.5Z" />
        <path d="M8.5 11v3M7 12.5h3" />
      </>
    ),
    maps: (
      <>
        <path d="M12 20.5s6-5.4 6-10a6 6 0 0 0-12 0c0 4.6 6 10 6 10Z" />
        <circle cx="12" cy="10.5" r="2.2" />
      </>
    ),
    calendar: (
      <>
        <rect x="4" y="5.5" width="16" height="14" rx="1.5" />
        <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
      </>
    ),
  };
  return <svg {...base(p)}>{paths[name] ?? paths.chat}</svg>;
}
