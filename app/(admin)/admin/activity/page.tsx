"use client";

import * as React from "react";
import { Activity, Filter, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import { Select } from "@/components/ui/field";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui/primitives";
import {
  ACTIVITY_KIND_LABELS,
  ACTOR_LABELS,
  ActivityRow,
  ActivityRowSkeleton,
} from "@/components/admin/activity-row";
import { activityRepo, manufacturerRepo } from "@/lib/data";
import type { ActivityActorType, ActivityEvent, ActivityKind } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { cn, formatDate } from "@/lib/utils";
import { SearchField } from "@/components/ui/filter-bar";

/*
  The full platform timeline.

  Every event here is derived from a timestamp on a real record, so this page is
  also the honest answer to "did that actually happen?" — if an action shows up
  in the feed, the record behind it moved. Grouping by day rather than paging
  keeps the reading order the one an ops person actually uses: what happened
  today, then yesterday.
*/

const ACTOR_TYPES: ActivityActorType[] = ["manufacturer", "buyer", "ops", "system"];

const RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: 0 },
] as const;

/** Day key in the viewer's timezone, so "today" means their today. */
function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function groupByDay(events: ActivityEvent[]) {
  const groups: { key: string; at: string; events: ActivityEvent[] }[] = [];
  for (const event of events) {
    const key = dayKey(event.at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.events.push(event);
    else groups.push({ key, at: event.at, events: [event] });
  }
  return groups;
}

export default function AdminActivityPage() {
  const [kinds, setKinds] = React.useState<ActivityKind[]>([]);
  const [actorType, setActorType] = React.useState("");
  const [manufacturerId, setManufacturerId] = React.useState("");
  const [days, setDays] = React.useState<number>(30);
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");

  // Typing in the search box should not fire a repository call per keystroke.
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 220);
    return () => clearTimeout(timer);
  }, [query]);

  // Counts describe what the *current* period and filters hold, so they match
  // what clicking a chip returns.
  const { data: kindCounts, error, refetch } = useQuery(
    () =>
      activityRepo.kinds({
        actorTypes: actorType ? [actorType as ActivityActorType] : undefined,
        manufacturerId: manufacturerId || undefined,
        since: days ? new Date(Date.now() - days * 86_400_000).toISOString() : undefined,
        query: debounced.trim() || undefined,
      }),
    [actorType, manufacturerId, days, debounced],
  );
  const { data: suppliers } = useQuery(() => manufacturerRepo.list({}), []);

  const kindKey = [...kinds].sort().join(",");

  const { data: events, loading } = useQuery(
    () =>
      activityRepo.list({
        kinds: kinds.length ? kinds : undefined,
        actorTypes: actorType ? [actorType as ActivityActorType] : undefined,
        manufacturerId: manufacturerId || undefined,
        // Computed in the fetcher, not in render: `days` is the real dependency.
        since: days ? new Date(Date.now() - days * 86_400_000).toISOString() : undefined,
        query: debounced.trim() || undefined,
        limit: 400,
      }),
    [kindKey, actorType, manufacturerId, days, debounced],
  );

  const rows = events ?? [];
  const groups = groupByDay(rows);
  const filtersOn =
    kinds.length > 0 || actorType !== "" || manufacturerId !== "" || debounced !== "";

  function toggleKind(kind: ActivityKind) {
    setKinds((current) =>
      current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind],
    );
  }

  function clearAll() {
    setKinds([]);
    setActorType("");
    setManufacturerId("");
    setQuery("");
  }

  const totalEvents = (kindCounts ?? []).reduce((sum, k) => sum + k.count, 0);

  return (
    <>
      <PageHeader
        title="Activity"
        description="Everything that has happened on the platform, newest first."
        breadcrumbs={[
          { label: "Buildex Admin", href: "/admin" },
          { label: "Activity" },
        ]}
      />

      <QueryError error={error} onRetry={refetch} />

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] [&>*]:min-w-0">
        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
                Filters
              </CardTitle>
              {filtersOn ? (
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  <X aria-hidden="true" />
                  Clear
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardBody className="space-y-5">
            <div>
              <label
                htmlFor="activity-search"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Search
              </label>
              <SearchField
                id="activity-search"
                value={query}
                onChange={setQuery}
                placeholder="Supplier, product, shop"
              />
            </div>

            <div>
              <label
                htmlFor="activity-range"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Period
              </label>
              <Select
                id="activity-range"
                value={String(days)}
                onChange={(event) => setDays(Number(event.target.value))}
                className="h-9"
              >
                {RANGES.map((r) => (
                  <option key={r.days} value={r.days}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label
                htmlFor="activity-actor"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Who acted
              </label>
              <Select
                id="activity-actor"
                value={actorType}
                onChange={(event) => setActorType(event.target.value)}
                className="h-9"
              >
                <option value="">Anyone</option>
                {ACTOR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ACTOR_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label
                htmlFor="activity-supplier"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Supplier
              </label>
              <Select
                id="activity-supplier"
                value={manufacturerId}
                onChange={(event) => setManufacturerId(event.target.value)}
                className="h-9"
              >
                <option value="">All suppliers</option>
                {(suppliers ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.tradingName}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Event type</p>
              <div role="group" aria-label="Filter by event type" className="space-y-1.5">
                {(kindCounts ?? []).map(({ kind, count }) => {
                  const selected = kinds.includes(kind);
                  return (
                    <button
                      key={kind}
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      onClick={() => toggleKind(kind)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                        selected
                          ? "border-brand bg-brand-soft font-medium text-foreground"
                          : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
                      )}
                    >
                      <span className="min-w-0 truncate">
                        {ACTIVITY_KIND_LABELS[kind]}
                      </span>
                      <span className="shrink-0 text-numeric text-subtle-foreground">
                        {count}
                      </span>
                    </button>
                  );
                })}
                {kindCounts ? null : (
                  <div className="space-y-1.5">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-7 animate-pulse rounded-md bg-surface-muted"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        <div>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-muted-foreground text-numeric">
              {loading && !events
                ? "Loading events…"
                : totalEvents > rows.length
                  ? `Showing ${rows.length} of ${totalEvents} matching events`
                  : `${rows.length} event${rows.length === 1 ? "" : "s"}`}
            </p>
            {rows.length >= 400 ? (
              <p className="text-xs text-muted-foreground">
                Capped at the 400 most recent — narrow the period to see further back.
              </p>
            ) : null}
          </div>

          {loading && !events ? (
            <Card>
              <ul className="divide-y divide-border">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <ActivityRowSkeleton key={i} />
                ))}
              </ul>
            </Card>
          ) : rows.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Activity className="size-5" />}
                title="No events match"
                description={
                  filtersOn
                    ? "Nothing in this period matches those filters."
                    : "Nothing has happened in this period."
                }
                action={
                  filtersOn ? (
                    <Button variant="secondary" onClick={clearAll}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <div className="space-y-5">
              {groups.map((group) => (
                <section key={group.key} aria-labelledby={`day-${group.key}`}>
                  <h2
                    id={`day-${group.key}`}
                    className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {formatDate(group.at, "long")}
                    <span className="ml-2 font-normal normal-case tracking-normal text-subtle-foreground text-numeric">
                      {group.events.length} event
                      {group.events.length === 1 ? "" : "s"}
                    </span>
                  </h2>
                  <Card>
                    <ul className="divide-y divide-border">
                      {group.events.map((event) => (
                        <ActivityRow key={event.id} event={event} />
                      ))}
                    </ul>
                  </Card>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
