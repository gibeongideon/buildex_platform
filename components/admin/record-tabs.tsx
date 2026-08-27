"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/*
  A tab bar for a single record.

  A manufacturer's record spans company details, catalogue, enquiries,
  campaigns, verification and history — stacked, that is a very long page for
  something an ops person scans. Tabs keep each answer one click away.

  Written out rather than pulled from a library because the keyboard contract is
  the whole job: roving tabindex, arrows to move, Home/End to jump. Radix would
  bring the same behaviour and another dependency for one usage.
*/

export type RecordTab = {
  key: string;
  label: string;
  /** Shown as a count chip beside the label. Omit when there is nothing to count. */
  count?: number;
};

export function RecordTabs({
  tabs,
  active,
  onChange,
  label,
  idPrefix,
}: {
  tabs: RecordTab[];
  active: string;
  onChange: (key: string) => void;
  label: string;
  idPrefix: string;
}) {
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  function move(delta: number) {
    const index = tabs.findIndex((t) => t.key === active);
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    onChange(next.key);
    refs.current[next.key]?.focus();
  }

  function jump(to: 0 | -1) {
    const next = to === 0 ? tabs[0] : tabs[tabs.length - 1];
    onChange(next.key);
    refs.current[next.key]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className="scroll-x -mx-1 flex gap-1 border-b border-border px-1"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          move(1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          move(-1);
        } else if (event.key === "Home") {
          event.preventDefault();
          jump(0);
        } else if (event.key === "End") {
          event.preventDefault();
          jump(-1);
        }
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            ref={(node) => {
              refs.current[tab.key] = node;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.key}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.key)}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors",
              selected
                ? "border-brand font-semibold text-foreground"
                : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs text-numeric",
                  selected
                    ? "bg-brand-soft text-brand"
                    : "bg-surface-muted text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function RecordPanel({
  tabKey,
  active,
  idPrefix,
  children,
}: {
  tabKey: string;
  active: string;
  idPrefix: string;
  children: React.ReactNode;
}) {
  if (tabKey !== active) return null;
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${tabKey}`}
      aria-labelledby={`${idPrefix}-tab-${tabKey}`}
      tabIndex={0}
      className="mt-6 focus-visible:outline-none"
    >
      {children}
    </div>
  );
}
