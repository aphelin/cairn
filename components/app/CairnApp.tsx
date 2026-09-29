"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Level } from "@/lib/content";
import { useStore } from "@/lib/store";
import { CLOCK, MODE_NAMES, TABS, type TabId } from "@/lib/appDemo";
import { AppDetail, Apps } from "./Apps";
import { DeviceDetail } from "./Devices";
import { Insights } from "./Insights";
import { ModeEditor, Modes } from "./Modes";
import { Schedules } from "./Schedules";
import { Stack, type Route } from "./Stack";
import { Today } from "./Today";
import { AppsIcon, BatteryIcon, InsightsIcon, ModesIcon, SchedulesIcon, SignalIcon, TodayIcon, WifiIcon } from "./icons";
import { BARS, haptic, reducedMotion, useScrub } from "./ios";
import styles from "./CairnApp.module.css";

const ICONS = { modes: ModesIcon, apps: AppsIcon, schedules: SchedulesIcon, insights: InsightsIcon };

// Tab bars draw every symbol filled, as iOS does; the selected one takes the
// tint. Today's symbol is the dial, pointing at the mode.
function TabIcon({ tab, level }: { tab: TabId; level: Level }) {
  if (tab === "today") return <TodayIcon level={level} className={styles.tabIcon} />;
  const Icon = ICONS[tab];
  return <Icon className={styles.tabIcon} />;
}

// A note beside the phone asks for a place in the app: a tab, a screen on
// it, or Today's safeguards. `n` changes with every ask.
export type Command = { n: number; tab: TabId; route?: Route; reveal?: boolean };

type Props = {
  tab: TabId;
  // Which way the last tab change went: 1 right, -1 left, 0 none.
  from: number;
  onTab: (tab: TabId) => void;
  command: Command | null;
};

const EMPTY: Record<TabId, Route[]> = { today: [], modes: [], apps: [], schedules: [], insights: [] };

// Screens that a row opens, whichever tab's stack they're on.
const render = (r: Route) =>
  r.kind === "app" ? <AppDetail id={r.id} /> : r.kind === "mode" ? <ModeEditor level={r.level} /> : <DeviceDetail id={r.id} />;

const ROOTS: Record<TabId, React.ReactNode> = {
  today: <Today />,
  modes: <Modes />,
  apps: <Apps />,
  schedules: <Schedules />,
  insights: <Insights />,
};

// The Cairn companion app, working. The mode is the page's own: turning it
// here turns the dial, and turning the dial shows here.
export function CairnApp({ tab, from, onTab, command }: Props) {
  const level = useStore((s) => s.level);
  const [stacks, setStacks] = useState(EMPTY);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const lens = useRef<HTMLSpanElement>(null);
  const host = useRef<HTMLDivElement>(null);

  const onStack = useCallback((t: TabId, routes: Route[]) => setStacks((s) => ({ ...s, [t]: routes })), []);

  // A note opens its place: the tab, with just that screen on its stack.
  const done = useRef(0);
  useEffect(() => {
    if (!command || command.n === done.current) return;
    done.current = command.n;
    setStacks((s) => ({ ...s, [command.tab]: command.route ? [command.route] : [] }));
    if (!command.reveal) return;
    // Today's safeguards, brought up under the bar.
    const id = requestAnimationFrame(() => {
      const head = document.getElementById("cairn-safeguards");
      const panel = head?.closest<HTMLElement>("[data-ios-scroll]");
      if (!head || !panel) return;
      const top = head.getBoundingClientRect().top - panel.getBoundingClientRect().top;
      const k = panel.getBoundingClientRect().height / panel.offsetHeight || 1;
      panel.scrollTo({ top: panel.scrollTop + top / k - BARS.top - 12, behavior: reducedMotion() ? "auto" : "smooth" });
      head.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [command]);

  // Nothing in the app animates on its own while it's out of sight.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => el.toggleAttribute("data-away", !e?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onTabKey = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const n = TABS.length;
    const next = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onTab(TABS[next]!.id);
    tabs.current[next]?.focus({ preventScroll: true });
  };

  const index = TABS.findIndex((t) => t.id === tab);

  // The tab bar's lens can be slid from tab to tab; each tab it passes ticks.
  const bar = useRef<HTMLDivElement>(null);
  const scrub = useScrub(bar, {
    count: TABS.length,
    pad: 4,
    onPick: (i) => onTab(TABS[i]!.id),
    onNear: () => haptic(3),
  });

  // As the lens travels it stretches along the way it's going and settles,
  // a drop of glass rather than a sliding box.
  const was = useRef(index);
  useEffect(() => {
    const prev = was.current;
    was.current = index;
    const el = lens.current;
    if (prev === index || !el || reducedMotion()) return;
    const d = Math.min(3, Math.abs(index - prev));
    el.animate([{ scale: "1 1" }, { scale: `${1 + 0.09 * d} ${1 - 0.06 * d}`, offset: 0.32 }, { scale: "1 1" }], {
      duration: 520,
      easing: "cubic-bezier(0.3, 0.7, 0.4, 1)",
    });
  }, [index]);

  // Tapping the tab that's already open takes its stack back to the top, as iOS does.
  const pick = (t: TabId) => {
    if (t === tab && stacks[t].length) onStack(t, []);
    else onTab(t);
  };

  return (
    <div ref={host} className={styles.app} data-mode={MODE_NAMES[level]} data-depicted="" data-ios-host="">
      <div className={styles.status} aria-hidden="true">
        <span className={styles.time}>{CLOCK}</span>
        <span className={styles.statusIcons}>
          <SignalIcon className={styles.signal} />
          <WifiIcon className={styles.wifi} />
          <BatteryIcon level={0.72} className={styles.battery} />
        </span>
      </div>

      <div
        ref={bar}
        className={styles.tabbar}
        role="tablist"
        aria-label="Cairn app"
        onKeyDown={onTabKey}
        data-edge={index === 0 || index === TABS.length - 1 ? "" : undefined}
        style={{ "--at": index, "--last": TABS.length - 1, "--count": TABS.length } as React.CSSProperties}
        {...scrub}
      >
        <span ref={lens} className={styles.lens} aria-hidden="true" />
        {TABS.map((t, i) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`cairn-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`cairn-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              className={styles.tab}
              onClick={() => pick(t.id)}
            >
              <TabIcon tab={t.id} level={level} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {TABS.map((t) => (
        <Stack key={t.id} tab={t.id} active={tab === t.id} from={from} routes={stacks[t.id]} onChange={onStack} root={ROOTS[t.id]} render={render} />
      ))}

      <span className={styles.edge} aria-hidden="true" />
      <span className={styles.home} aria-hidden="true" />
    </div>
  );
}
