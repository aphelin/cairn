"use client";

import { memo, useRef, useState } from "react";
import type { AppId } from "@/components/brand/appGlyphs";
import { AppIcon, APP_NAMES } from "@/components/brand/AppIcon";
import { APPS, ZONES } from "@/lib/content";
import { useStore } from "@/lib/store";
import { LIMIT, MODE_LEVELS, MODE_NAMES, hm, metres, modesLine, roomLine, type AppRule } from "@/lib/appDemo";
import { ModeTile } from "./Modes";
import { act, useApp } from "./state";
import { routeKey, usePage } from "./Stack";
import { ClearIcon, HourglassIcon, LockIcon, SearchIcon } from "./icons";
import { CheckRow, Footnote, GroupHead, NavRow, Screen, Stepper, Switch, Tile, Tween, ios, reducedMotion } from "./ios";
import styles from "./Apps.module.css";

const TODAY = Object.fromEntries(APPS.map((a) => [a.id, a.today])) as Record<AppId, number>;

// How an app stands today against its own limit, in a few words.
function lineOf(id: AppId, rule: AppRule) {
  const today = TODAY[id];
  if (rule.limit === null) return `${hm(today)} today`;
  if (today >= rule.limit) return "Limit reached for today";
  return `${today} of ${rule.limit} min today`;
}

// Today's use against the limit, as a short bar.
function Meter({ used, limit, wide }: { used: number; limit: number; wide?: boolean }) {
  return (
    <span className={styles.meter} data-wide={wide ? "" : undefined} data-over={used >= limit ? "" : undefined} aria-hidden="true">
      <span style={{ "--f": Math.min(1, used / limit) } as React.CSSProperties} />
    </span>
  );
}

// The apps, in two groups: those a mode locks, and those it leaves open (with
// or without a limit of their own). Each row opens the app's own settings.
export const Apps = memo(function Apps() {
  const rules = useApp((s) => s.apps);
  const page = usePage();
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const shown = APPS.filter((a) => !q || APP_NAMES[a.id].toLowerCase().includes(q));
  const lockedRows = shown.filter((a) => rules[a.id].modes.length > 0);
  const allowedRows = shown.filter((a) => rules[a.id].modes.length === 0);
  const lockedAll = APPS.filter((a) => rules[a.id].modes.length > 0).length;

  const row = (a: (typeof APPS)[number]) => {
    const rule = rules[a.id];
    const name = APP_NAMES[a.id];
    const locked = rule.modes.length > 0;
    return (
      <NavRow
        key={a.id}
        id={`cairn-app-${a.id}`}
        className={styles.app}
        icon={<AppIcon app={a.id} className={styles.icon} />}
        title={name}
        sub={
          locked ? (
            <span className={ios.num}>
              {modesLine(rule.modes)}
              {rule.limit !== null && ` · ${rule.limit} min a day`}
            </span>
          ) : (
            <span className={styles.use}>
              {rule.limit !== null && <Meter used={a.today} limit={rule.limit} />}
              <span className={ios.num}>{rule.limit === null ? `No limit · ${hm(a.today)} today` : a.today >= rule.limit ? "Limit reached for today" : `${a.today} of ${rule.limit} min today`}</span>
            </span>
          )
        }
        selected={page.above === routeKey({ kind: "app", id: a.id })}
        onOpen={(el) => page.push({ kind: "app", id: a.id }, el)}
      />
    );
  };

  return (
    <Screen title="Apps" sub={`${lockedAll} locked, ${APPS.length - lockedAll} allowed`}>
      <div className={styles.apps}>
        <div className={styles.search} role="search">
          <SearchIcon className={styles.searchIcon} />
          <input
            ref={input}
            type="search"
            className={styles.field}
            placeholder="Search"
            aria-label="Search apps"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.preventDefault();
                setQuery("");
              }
            }}
          />
          {query && (
            <button
              type="button"
              className={styles.clear}
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                input.current?.focus();
              }}
            >
              <ClearIcon />
            </button>
          )}
        </div>

        <p className="visually-hidden" aria-live="polite">
          {q ? (shown.length ? `${shown.length} app${shown.length === 1 ? "" : "s"} found` : "No apps found") : ""}
        </p>

        {lockedRows.length > 0 && (
          <>
            <GroupHead>
              Locked <span className={`${styles.count} ${ios.num}`}>{lockedRows.length}</span>
            </GroupHead>
            <ul className={ios.group} aria-label="Locked apps">
              {lockedRows.map(row)}
            </ul>
            <Footnote>Closed while their modes are on. To open them, walk to the dial.</Footnote>
          </>
        )}

        {allowedRows.length > 0 && (
          <>
            <GroupHead>
              Allowed <span className={`${styles.count} ${ios.num}`}>{allowedRows.length}</span>
            </GroupHead>
            <ul className={ios.group} aria-label="Allowed apps">
              {allowedRows.map(row)}
            </ul>
            <Footnote>Tap an app to lock it, or to give it a daily limit of its own.</Footnote>
          </>
        )}

        {shown.length === 0 && (
          <div className={styles.empty}>
            <SearchIcon className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No results for “{query.trim()}”</p>
            <p className={styles.emptyText}>Check the spelling or try a new search.</p>
          </div>
        )}
      </div>
    </Screen>
  );
});

const perDay = (n: number) => `${Math.round(n)} min a day`;

// One app's own rules: whether a mode locks it and which, and its own daily
// limit against what it has had today.
export const AppDetail = memo(function AppDetail({ id }: { id: AppId }) {
  const rule = useApp((s) => s.apps[id]);
  const modes = useApp((s) => s.modes);
  const level = useStore((s) => s.level);
  const name = APP_NAMES[id];
  const today = TODAY[id];
  const locked = rule.modes.length > 0;
  const lockedNow = level > 0 && rule.modes.includes(level as 1 | 2 | 3);
  const over = rule.limit !== null && today >= rule.limit;
  const list = useRef<HTMLUListElement>(null);
  const line = lineOf(id, rule);

  const toggle = (m: 1 | 2 | 3) => {
    // The last mode stays: to leave it open, switch its lock off instead.
    if (rule.modes.length === 1 && rule.modes[0] === m) {
      const row = list.current?.querySelector<HTMLElement>(`[data-mode="${MODE_NAMES[m]}"]`)?.closest("li");
      if (row && !reducedMotion()) row.animate([{ translate: "0" }, { translate: "-5px" }, { translate: "4px" }, { translate: "-2px" }, { translate: "0" }], { duration: 340, easing: "ease-out" });
      return;
    }
    act.toggleAppMode(id, m);
  };

  return (
    <Screen title={name} sub={lockedNow ? `Locked now · ${hm(today)} today` : over ? `Locked until midnight · ${hm(today)} today` : line} art={<AppIcon app={id} className={styles.art} />}>
      <ul className={ios.group}>
        <li className={`${ios.row} ${styles.item}`}>
          <Tile>
            <LockIcon />
          </Tile>
          <span className={ios.rowText}>
            <span className={ios.rowTitle}>Lock with the dial</span>
            <span className={ios.rowSub} id={`cairn-lock-${id}-sub`}>
              {locked ? `Locked while ${modesLine(rule.modes)} ${rule.modes.length === 1 ? "is" : "are"} on` : "Open whatever the dial says"}
            </span>
          </span>
          <Switch id={`cairn-lock-${id}`} label={`Lock ${name}`} describedBy={`cairn-lock-${id}-sub`} checked={locked} onChange={(v) => act.setAppLocked(id, v)} />
        </li>
      </ul>

      {locked && (
        <>
          <GroupHead>Locks in</GroupHead>
          <div role="group" aria-label={`Modes that lock ${name}`}>
            <ul ref={list} className={ios.group}>
              {MODE_LEVELS.map((m) => (
                <ModeCheck key={m} m={m} sub={m === 1 ? `${metres(modes[m].reach)} round the dial` : `${metres(modes[m].reach)} · ${roomLine(modes[m].rooms)}`} checked={rule.modes.includes(m)} onToggle={() => toggle(m)} />
              ))}
            </ul>
          </div>
          <Footnote>Each mode locks its own list. Keep one on, or switch the lock off.</Footnote>
        </>
      )}

      <GroupHead>Daily limit</GroupHead>
      <ul className={ios.group}>
        <li className={`${ios.row} ${styles.item}`}>
          <Tile>
            <HourglassIcon />
          </Tile>
          <span className={ios.rowText}>
            <span className={ios.rowTitle}>Set a limit</span>
            <span className={ios.rowSub}>{rule.limit === null ? "No limit today" : "At the limit, it locks for the day"}</span>
          </span>
          <Switch
            id={`cairn-limit-${id}`}
            label={`Daily limit for ${name}`}
            checked={rule.limit !== null}
            onChange={(v) => act.setLimit(id, v ? LIMIT.initial : null)}
          />
        </li>
        {rule.limit !== null && (
          <>
            <li className={`${ios.row} ${styles.limit}`}>
              <span className={ios.rowText}>
                <output className={`${styles.limitValue} ${ios.num}`} aria-live="polite">
                  <Tween value={rule.limit} format={perDay} />
                  <span className="visually-hidden">{rule.limit} minutes a day</span>
                </output>
              </span>
              <Stepper
                label={`Daily limit for ${name}`}
                lessLabel="Shorter limit"
                moreLabel="Longer limit"
                less={rule.limit > LIMIT.min}
                more={rule.limit < LIMIT.max}
                onLess={() => act.setLimit(id, Math.max(LIMIT.min, (rule.limit ?? LIMIT.initial) - LIMIT.step))}
                onMore={() => act.setLimit(id, Math.min(LIMIT.max, (rule.limit ?? LIMIT.initial) + LIMIT.step))}
              />
            </li>
            <li className={`${ios.row} ${styles.usage}`}>
              <span className={styles.usageHead}>
                <span className={ios.num}>{over ? "All used today" : `${hm(today)} used`}</span>
                <span className={`${styles.usageLeft} ${ios.num}`}>{over ? "Locked until midnight" : `${rule.limit - today} min left`}</span>
              </span>
              <Meter used={today} limit={rule.limit} wide />
            </li>
          </>
        )}
      </ul>
      <Footnote>A limit holds with the dial off too.</Footnote>
    </Screen>
  );
});

function ModeCheck({ m, sub, checked, onToggle }: { m: 1 | 2 | 3; sub: string; checked: boolean; onToggle: () => void }) {
  return (
    <CheckRow
      className={styles.mode}
      icon={<ModeTile level={m} />}
      title={ZONES[m]!.label}
      sub={<span className={ios.num}>{sub}</span>}
      checked={checked}
      onToggle={onToggle}
    />
  );
}
