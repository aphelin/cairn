"use client";

// Icons inside the drawn app, drawn the way SF Symbols are: a 24 grid, round
// joins, and filled symbols wherever iOS fills them (every tab bar item and
// the glyphs in coloured tiles), with their details cut clean through so
// they sit on glass as well as on white. Line symbols stay line where iOS
// draws them as line: search, the NFC waves, the trend arrow.
import { useId, type SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const line = (p: P) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
  ...p,
});

const solid = (p: P) => ({
  viewBox: "0 0 24 24",
  fill: "currentColor",
  "aria-hidden": true,
  focusable: false,
  ...p,
});

// A circle as a path, so it can be cut from another with the even-odd rule.
const ring = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

// An id safe to use in url(#…), for a symbol's cut mask.
const useMaskId = () => "cut" + useId().replace(/[^\w-]/g, "");

// A symbol with lines cut through it: whatever `cut` draws is removed.
function Cut({ id, cut, children }: { id: string; cut: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <rect width="24" height="24" fill="white" />
          <g fill="black" stroke="black">
            {cut}
          </g>
        </mask>
      </defs>
      <g mask={`url(#${id})`}>{children}</g>
    </>
  );
}

const ANGLES = [-135, -45, 45, 135];

// The dial from above, a solid disc with its dot cut through, pointing at the mode.
export const TodayIcon = ({ level = 0, ...p }: P & { level?: number }) => {
  const a = ((ANGLES[level] ?? -135) * Math.PI) / 180;
  const x = 12 + Math.sin(a) * 4.9;
  const y = 12 - Math.cos(a) * 4.9;
  return (
    <svg {...solid(p)}>
      <path fillRule="evenodd" d={`${ring(12, 12, 9.6)}${ring(x, y, 2.05)}`} />
    </svg>
  );
};

// square.grid.2x2.fill
export const AppsIcon = (p: P) => (
  <svg {...solid(p)}>
    <rect x="3.25" y="3.25" width="7.75" height="7.75" rx="2.3" />
    <rect x="13" y="3.25" width="7.75" height="7.75" rx="2.3" />
    <rect x="3.25" y="13" width="7.75" height="7.75" rx="2.3" />
    <rect x="13" y="13" width="7.75" height="7.75" rx="2.3" />
  </svg>
);

// clock.fill
export const SchedulesIcon = (p: P) => {
  const id = useMaskId();
  return (
    <svg {...solid(p)}>
      <Cut id={id} cut={<path d="M12 6.6v5.7l3.7 2.2" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />}>
        <circle cx="12" cy="12" r="9.6" />
      </Cut>
    </svg>
  );
};

// chart.bar.fill
export const InsightsIcon = (p: P) => (
  <svg {...solid(p)}>
    <rect x="3.5" y="11" width="4.6" height="9.75" rx="1.5" />
    <rect x="9.7" y="3.25" width="4.6" height="17.5" rx="1.5" />
    <rect x="15.9" y="7.5" width="4.6" height="13.25" rx="1.5" />
  </svg>
);

// magnifyingglass
export const SearchIcon = (p: P) => (
  <svg {...line({ strokeWidth: 2.1, ...p })}>
    <circle cx="10.4" cy="10.4" r="6.1" />
    <path d="m15 15 4.8 4.8" />
  </svg>
);

// xmark.circle.fill
export const ClearIcon = (p: P) => {
  const id = useMaskId();
  return (
    <svg {...solid(p)}>
      <Cut id={id} cut={<path d="m8.9 8.9 6.2 6.2M15.1 8.9l-6.2 6.2" fill="none" strokeWidth="1.9" strokeLinecap="round" />}>
        <circle cx="12" cy="12" r="9.5" />
      </Cut>
    </svg>
  );
};

export const WifiIcon = (p: P) => (
  <svg viewBox="0 0 24 18" fill="currentColor" aria-hidden focusable={false} {...p}>
    <path d="M12 3.2c3.3 0 6.3 1.3 8.5 3.4.3.3.8.3 1.1 0l1.1-1.1c.3-.3.3-.8 0-1.1A15 15 0 0 0 12 .2 15 15 0 0 0 1.3 4.4c-.3.3-.3.8 0 1.1l1.1 1.1c.3.3.8.3 1.1 0A12 12 0 0 1 12 3.2Z" />
    <path d="M12 8.2c1.9 0 3.6.7 4.9 1.9.3.3.8.3 1.1 0l1.1-1.1c.3-.3.3-.8 0-1.1A10.4 10.4 0 0 0 12 5.2c-2.7 0-5.2 1-7.1 2.7-.3.3-.3.8 0 1.1L6 10.1c.3.3.8.3 1.1 0A7 7 0 0 1 12 8.2Z" />
    <path d="M14.8 12.6c.3-.3.3-.8 0-1.1A4.3 4.3 0 0 0 12 10.3c-1 0-2 .4-2.8 1.2-.3.3-.3.8 0 1.1l2.2 2.2c.3.3.8.3 1.1 0l2.3-2.2Z" />
  </svg>
);

export const SignalIcon = (p: P) => (
  <svg viewBox="0 0 20 14" fill="currentColor" aria-hidden focusable={false} {...p}>
    <rect x="0" y="9" width="3.4" height="5" rx="1" />
    <rect x="5.4" y="6.2" width="3.4" height="7.8" rx="1" />
    <rect x="10.8" y="3.2" width="3.4" height="10.8" rx="1" />
    <rect x="16.2" y="0" width="3.4" height="14" rx="1" />
  </svg>
);

export const BatteryIcon = ({ level = 0.8, ...p }: P & { level?: number }) => (
  <svg viewBox="0 0 28 14" fill="none" aria-hidden focusable={false} {...p}>
    <rect x="0.75" y="0.75" width="23.5" height="12.5" rx="3.8" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" />
    <rect x="2.5" y="2.5" width={20 * level} height="9" rx="2.3" fill="currentColor" />
    <path d="M26 5v4c.9-.3 1.4-1.1 1.4-2s-.5-1.7-1.4-2Z" fill="currentColor" fillOpacity="0.45" />
  </svg>
);

// arrow.down
export const ArrowDownIcon = (p: P) => (
  <svg {...line({ strokeWidth: 2.2, ...p })}>
    <path d="M12 5v14M6.5 13.5 12 19l5.5-5.5" />
  </svg>
);

// moon.fill
export const MoonIcon = (p: P) => (
  <svg {...solid(p)}>
    <path d="M20.2 14.6A8.5 8.5 0 0 1 9.4 3.8a.6.6 0 0 0-.8-.7 9.3 9.3 0 1 0 12.3 12.3.6.6 0 0 0-.7-.8Z" />
  </svg>
);

// checkmark.shield.fill
export const ShieldIcon = (p: P) => {
  const id = useMaskId();
  return (
    <svg {...solid(p)}>
      <Cut id={id} cut={<path d="m8.7 12.1 2.4 2.4 4.3-4.6" fill="none" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />}>
        <path d="M11.4 2.7a1.8 1.8 0 0 1 1.2 0l6.2 2.3c.7.3 1.2.9 1.2 1.7v4.9c0 4.6-3.2 8.3-7.4 9.7a1.8 1.8 0 0 1-1.2 0C7.2 19.9 4 16.2 4 11.6V6.7c0-.8.5-1.4 1.2-1.7Z" />
      </Cut>
    </svg>
  );
};

// bolt.fill
export const BoltIcon = (p: P) => (
  <svg {...solid(p)}>
    <path d="M13.6 2.4c.5-.6 1.4-.2 1.3.6l-1 6.5h4.6c.8 0 1.2.9.7 1.5L10.4 21.6c-.5.6-1.4.2-1.3-.6l1-6.5H5.5c-.8 0-1.2-.9-.7-1.5Z" />
  </svg>
);

// wave.3.right: the waves of a tap.
export const TapIcon = (p: P) => (
  <svg {...line(p)}>
    <path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17" />
  </svg>
);

// briefcase.fill
export const BriefcaseIcon = (p: P) => {
  const id = useMaskId();
  return (
    <svg {...solid(p)}>
      <Cut id={id} cut={<path d="M3 12.6h18" fill="none" strokeWidth="1.6" />}>
        <path d="M9 7V5.6c0-.9.7-1.6 1.6-1.6h2.8c.9 0 1.6.7 1.6 1.6V7" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <rect x="3" y="7" width="18" height="13" rx="2.8" />
      </Cut>
    </svg>
  );
};

// calendar: the page, its binding and today marked.
export const CalendarIcon = (p: P) => {
  const id = useMaskId();
  return (
    <svg {...solid(p)}>
      <Cut id={id} cut={<rect x="5.4" y="9.6" width="13.2" height="9.2" rx="1.2" strokeWidth="0" />}>
        <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
      </Cut>
      <rect x="13.2" y="13.2" width="3.6" height="3.4" rx="0.9" />
      <rect x="7" y="2.5" width="2" height="4" rx="1" />
      <rect x="15" y="2.5" width="2" height="4" rx="1" />
    </svg>
  );
};

// A mode's reach seen from above: the dial's dot in a ring of its colour,
// cut clean through so it sits on glass. The Modes tab's symbol.
export const ModesIcon = (p: P) => (
  <svg {...solid(p)}>
    <path fillRule="evenodd" d={`${ring(12, 12, 9.8)}${ring(12, 12, 8.1)}${ring(12, 12, 6.3)}${ring(12, 12, 4.6)}${ring(12, 12, 2.5)}`} />
  </svg>
);

// chevron.right, as a list row ends in one.
export const ChevronRightIcon = (p: P) => (
  <svg {...line({ strokeWidth: 2.4, ...p })}>
    <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
  </svg>
);

// chevron.left, for the back button.
export const ChevronLeftIcon = (p: P) => (
  <svg {...line({ strokeWidth: 2.5, ...p })}>
    <path d="M15 4.5 7.5 12l7.5 7.5" />
  </svg>
);

// checkmark, for a row that's been picked.
export const CheckmarkIcon = (p: P & { "data-on"?: string }) => (
  <svg {...line({ strokeWidth: 2.5, ...p })}>
    <path d="m4.8 12.6 4.6 4.6L19.4 6.9" />
  </svg>
);

// phone.fill
export const PhoneIcon = (p: P) => (
  <svg {...solid(p)}>
    <path d="M7.1 3.3c.6-.4 1.4-.3 1.9.3l2 2.6c.4.6.4 1.4-.1 1.9l-1.2 1.3c.9 1.9 2.4 3.4 4.3 4.3l1.3-1.2c.5-.5 1.3-.6 1.9-.1l2.6 2c.6.5.7 1.3.3 1.9l-1 1.6c-.6.9-1.7 1.4-2.8 1.2-6-1.1-10.6-5.7-11.7-11.7-.2-1.1.3-2.2 1.2-2.8Z" />
  </svg>
);

// message.fill
export const MessageIcon = (p: P) => (
  <svg {...solid(p)}>
    <path d="M12 3.6c5 0 9 3.3 9 7.5s-4 7.5-9 7.5c-.9 0-1.7-.1-2.5-.3l-3.7 2c-.5.3-1.1-.2-.9-.8l.8-2.7C3.9 15.5 3 13.4 3 11.1c0-4.2 4-7.5 9-7.5Z" />
  </svg>
);

// alarm.fill
export const AlarmIcon = (p: P) => {
  const id = useMaskId();
  return (
    <svg {...solid(p)}>
      <Cut id={id} cut={<path d="M12 9.2v4.2l2.6 1.6" fill="none" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />}>
        <circle cx="12" cy="13" r="7.6" />
      </Cut>
      <path d="M3.6 7.2a4.6 4.6 0 0 1 3.5-3.6c.5-.1.8.5.4.8L4.4 7.6c-.4.3-.9 0-.8-.4ZM20.4 7.2a4.6 4.6 0 0 0-3.5-3.6c-.5-.1-.8.5-.4.8l3.1 3.2c.4.3.9 0 .8-.4Z" />
    </svg>
  );
};

// location.fill: the arrow maps point with.
export const MapIcon = (p: P) => (
  <svg {...solid(p)}>
    <path d="M19.6 3.6c.6-.3 1.1.3.9.9l-6.9 15.2c-.3.7-1.3.6-1.5-.1l-1.5-5.4c-.1-.3-.3-.5-.6-.6l-5.4-1.5c-.7-.2-.8-1.2-.1-1.5Z" />
  </svg>
);

// figure.walk
export const WalkIcon = (p: P) => (
  <svg {...solid(p)}>
    <circle cx="13.3" cy="4.1" r="2.1" />
    <path d="M11.3 7.3c.8-.4 1.8-.2 2.3.5l1.7 2.6 2.6 1.1c.6.3.8.9.6 1.5-.3.5-.9.8-1.5.5l-2.9-1.2-.9 3.1 2.2 2.4c.2.2.3.5.3.8l.3 3.3c0 .6-.4 1.1-1 1.2-.6 0-1.1-.4-1.2-1l-.2-2.9-2.1-2.1-1.4 3.4-2.5 2.8c-.4.4-1.1.5-1.5.1-.5-.4-.5-1.1-.1-1.5l2.3-2.6 2.2-7.3-1.3.7-1 2.6c-.2.6-.8.9-1.4.7-.6-.2-.9-.8-.7-1.4l1.2-3.1c.1-.3.3-.5.6-.6Z" />
  </svg>
);

// The dial from above, turned down to Off: its dot at half past seven.
export const DialDownIcon = (p: P) => {
  const a = (-135 * Math.PI) / 180;
  return (
    <svg {...solid(p)}>
      <path fillRule="evenodd" d={`${ring(12, 12, 9.6)}${ring(12 + Math.sin(a) * 4.9, 12 - Math.cos(a) * 4.9, 2.05)}`} />
    </svg>
  );
};

// hourglass, for a daily limit.
export const HourglassIcon = (p: P) => (
  <svg {...solid(p)}>
    <path d="M6.5 2.8h11c.6 0 1 .4 1 1s-.4 1-1 1h-.3v1.6c0 2-1.1 3.8-2.8 4.8l-.7.4v.8l.7.4c1.7 1 2.8 2.8 2.8 4.8v1.6h.3c.6 0 1 .4 1 1s-.4 1-1 1h-11c-.6 0-1-.4-1-1s.4-1 1-1h.3v-1.6c0-2 1.1-3.8 2.8-4.8l.7-.4v-.8l-.7-.4C7.9 10.2 6.8 8.4 6.8 6.4V4.8h-.3c-.6 0-1-.4-1-1s.4-1 1-1Z" />
  </svg>
);

// lock.fill
export const LockIcon = (p: P) => (
  <svg {...solid(p)}>
    <path d="M8 10V7.6a4 4 0 0 1 8 0V10h.4c1.4 0 2.4 1 2.4 2.4v6.2c0 1.4-1 2.4-2.4 2.4H7.6c-1.4 0-2.4-1-2.4-2.4v-6.2c0-1.4 1-2.4 2.4-2.4Zm2 0h4V7.6a2 2 0 0 0-4 0Z" />
  </svg>
);

// A small and a large reach, for the ends of the reach slider.
export const ReachSmallIcon = (p: P) => (
  <svg {...line({ strokeWidth: 1.8, ...p })}>
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const ReachLargeIcon = (p: P) => (
  <svg {...line({ strokeWidth: 1.8, ...p })}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
);

// lightbulb.fill, for Home's glowing band.
export const LightIcon = (p: P) => (
  <svg {...solid(p)}>
    <path d="M12 2.6a6.9 6.9 0 0 1 4.2 12.4c-.6.5-1 1.1-1 1.8v.4H8.8v-.4c0-.7-.4-1.3-1-1.8A6.9 6.9 0 0 1 12 2.6ZM8.9 18.6h6.2v.8c0 1.1-.9 2-2 2h-2.2c-1.1 0-2-.9-2-2Z" />
  </svg>
);

// plus, for a room that can be added.
export const PlusIcon = (p: P) => (
  <svg {...line({ strokeWidth: 2.4, ...p })}>
    <path d="M12 5.5v13M5.5 12h13" />
  </svg>
);
