import { checkMeta } from "@/lib/schemas/verification";
import { documentTypeMeta } from "@/lib/schemas/document";
import { packageMeta } from "@/lib/schemas/subscription";
import { sleep } from "@/lib/utils";
import type {
  ActivityEvent,
  ActivityFilter,
  ActivityKind,
  ActivityRepo,
} from "@/lib/data/types";
import { getSnapshot } from "./db";
import { NORMAL } from "./latency";

/*
  The platform activity timeline.

  Derived from the timestamps already on every record rather than a separate
  events table — the same principle as `InsightsRepo`. Three consequences worth
  knowing:

    · It is populated the moment it exists (~480 events from the current seed
      data, spanning about a year), so the console is never an empty shell.
    · It can never disagree with the records it describes, because it *is* those
      records read a different way.
    · Anything a user does in the demo — quoting an enquiry, adding a listing,
      approving a check — appears automatically. There is no event to remember
      to emit, which is the usual way an audit log silently goes stale.

  At the backend cutover this becomes a real append-only log. The interface does
  not move, and the derivation here becomes the backfill for historic rows.
*/

function event(e: ActivityEvent): ActivityEvent {
  return e;
}

/**
 * Who a verification check belongs to.
 *
 * Two of the five checks are Buildex's own work — document completeness sits
 * with Operations, the site visit with the field team — and the other three are
 * external registry lookups. Attributing all of them to "system" made the
 * console unable to answer "what has Buildex actually done", which is the one
 * question the team's audit trail is for.
 */
function checkActor(authority: string): ActivityEvent["actor"] {
  return {
    type: authority.startsWith("Buildex") ? "ops" : "system",
    label: authority,
  };
}

/** Every event the current data implies, newest first. */
function deriveEvents(): ActivityEvent[] {
  const { manufacturers, products, enquiries, campaigns } = getSnapshot();
  const byId = new Map(manufacturers.map((m) => [m.id, m]));
  const events: ActivityEvent[] = [];

  for (const m of manufacturers) {
    const actor = { type: "manufacturer" as const, label: m.tradingName };
    const entity = { type: "manufacturer" as const, id: m.id, label: m.tradingName };
    const href = `/admin/verification/${m.id}`;

    if (m.submittedAt) {
      events.push(
        event({
          id: `${m.id}:submitted`,
          at: m.submittedAt,
          kind: "application_submitted",
          actor,
          entity,
          summary: `${m.tradingName} submitted an application from ${m.county}`,
          href,
        }),
      );
    }

    if (m.verifiedAt) {
      events.push(
        event({
          id: `${m.id}:verified`,
          at: m.verifiedAt,
          kind: "manufacturer_verified",
          actor: { type: "ops", label: "Buildex Operations" },
          entity,
          summary: `${m.tradingName} cleared verification and went live`,
          href: `/admin/manufacturers/${m.id}`,
        }),
      );
    }

    for (const check of m.checks) {
      const meta = checkMeta(check.key);
      if (check.startedAt) {
        events.push(
          event({
            id: `${m.id}:check:${check.key}:started`,
            at: check.startedAt,
            kind: "check_started",
            actor: checkActor(meta.authority),
            entity,
            summary: `${meta.label} opened for ${m.tradingName}`,
            href,
          }),
        );
      }
      if (check.completedAt) {
        events.push(
          event({
            id: `${m.id}:check:${check.key}:passed`,
            at: check.completedAt,
            kind: "check_passed",
            actor: checkActor(meta.authority),
            entity,
            summary: `${meta.label} passed for ${m.tradingName}`,
            href,
          }),
        );
      }
    }

    for (const doc of m.documents) {
      events.push(
        event({
          id: `${m.id}:doc:${doc.type}`,
          at: doc.uploadedAt,
          kind: "document_uploaded",
          actor,
          entity,
          summary: `${m.tradingName} uploaded ${documentTypeMeta(doc.type).label}`,
          href,
        }),
      );
    }

    if (m.subscription) {
      events.push(
        event({
          id: `${m.id}:subscription`,
          at: m.subscription.startedAt,
          kind: "subscription_started",
          actor,
          entity,
          summary: `${m.tradingName} took the ${packageMeta(m.subscription.package).name} package`,
          href: `/admin/subscriptions`,
        }),
      );
    }
  }

  for (const p of products) {
    const m = byId.get(p.manufacturerId);
    if (!m) continue;
    const actor = { type: "manufacturer" as const, label: m.tradingName };
    const entity = { type: "product" as const, id: p.id, label: p.name };

    events.push(
      event({
        id: `${p.id}:created`,
        at: p.createdAt,
        kind: "listing_created",
        actor,
        entity,
        summary: `${m.tradingName} listed ${p.name}`,
        href: `/admin/listings`,
      }),
    );

    // Only a genuine edit, not the create echo.
    if (p.updatedAt !== p.createdAt) {
      events.push(
        event({
          id: `${p.id}:updated`,
          at: p.updatedAt,
          kind: "listing_updated",
          actor,
          entity,
          summary: `${m.tradingName} updated ${p.name}`,
          href: `/admin/listings`,
        }),
      );
    }
  }

  for (const e of enquiries) {
    const m = byId.get(e.manufacturerId);
    if (!m) continue;
    const entity = { type: "enquiry" as const, id: e.id, label: e.productName };

    events.push(
      event({
        id: `${e.id}:received`,
        at: e.createdAt,
        kind: "enquiry_received",
        actor: { type: "buyer", label: e.shopName },
        entity,
        summary: `${e.shopName} asked ${m.tradingName} for ${e.quantity} ${e.unit}${
          e.quantity === 1 ? "" : "s"
        } of ${e.productName}`,
        href: `/admin/enquiries`,
      }),
    );

    if (e.respondedAt) {
      events.push(
        event({
          id: `${e.id}:quoted`,
          at: e.respondedAt,
          kind: "enquiry_quoted",
          actor: { type: "manufacturer", label: m.tradingName },
          entity,
          summary: `${m.tradingName} responded to ${e.shopName} on ${e.productName}`,
          href: `/admin/enquiries`,
        }),
      );
    }
  }

  for (const c of campaigns) {
    const m = byId.get(c.manufacturerId);
    if (!m) continue;
    const entity = { type: "campaign" as const, id: c.id, label: c.name };
    const actor = { type: "manufacturer" as const, label: m.tradingName };

    // A draft has not started, whatever its startsAt says.
    if (c.status !== "draft") {
      events.push(
        event({
          id: `${c.id}:launched`,
          at: c.startsAt,
          kind: "campaign_launched",
          actor,
          entity,
          summary: `${m.tradingName} launched "${c.name}" across ${c.regions.join(", ")}`,
          href: `/admin/campaigns`,
        }),
      );
    }

    if (c.status === "ended" && c.endsAt) {
      events.push(
        event({
          id: `${c.id}:ended`,
          at: c.endsAt,
          kind: "campaign_ended",
          actor,
          entity,
          summary: `"${c.name}" ended after ${c.metrics.enquiries} enquiries`,
          href: `/admin/campaigns`,
        }),
      );
    }
  }

  // Drop anything dated in the future — an `endsAt` on a running campaign is a
  // schedule, not something that has happened.
  const now = Date.now();
  return events
    .filter((e) => new Date(e.at).getTime() <= now)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function matches(e: ActivityEvent, filter: ActivityFilter, manufacturerOf: Map<string, string>) {
  if (filter.kinds?.length && !filter.kinds.includes(e.kind)) return false;
  if (filter.actorTypes?.length && !filter.actorTypes.includes(e.actor.type)) return false;
  if (filter.since && new Date(e.at).getTime() < new Date(filter.since).getTime()) {
    return false;
  }
  if (filter.manufacturerId) {
    const owner =
      e.entity.type === "manufacturer" ? e.entity.id : manufacturerOf.get(e.entity.id);
    if (owner !== filter.manufacturerId) return false;
  }
  const q = filter.query?.trim().toLowerCase();
  if (q) {
    const haystack = `${e.summary} ${e.actor.label} ${e.entity.label}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

/** Which manufacturer each product / enquiry / campaign belongs to. */
function ownerIndex(): Map<string, string> {
  const { products, enquiries, campaigns } = getSnapshot();
  const index = new Map<string, string>();
  for (const p of products) index.set(p.id, p.manufacturerId);
  for (const e of enquiries) index.set(e.id, e.manufacturerId);
  for (const c of campaigns) index.set(c.id, c.manufacturerId);
  return index;
}

export const activityRepo: ActivityRepo = {
  async list(filter: ActivityFilter = {}) {
    await sleep(NORMAL);
    const owners = ownerIndex();
    const matched = deriveEvents().filter((e) => matches(e, filter, owners));
    return filter.limit ? matched.slice(0, filter.limit) : matched;
  },

  async kinds(filter: ActivityFilter = {}) {
    await sleep(NORMAL);
    const owners = ownerIndex();
    /*
      Counted against everything except the kind selection itself — standard
      facet behaviour. Counting the whole dataset instead meant a chip could
      read 112 inside a 30-day window that held three, so the number described
      nothing the click would produce.
    */
    const scope: ActivityFilter = { ...filter, kinds: undefined, limit: undefined };
    const counts = new Map<ActivityKind, number>();
    for (const e of deriveEvents()) {
      if (!matches(e, scope, owners)) continue;
      counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([kind, count]) => ({ kind, count }))
      .sort((a, b) => b.count - a.count);
  },
};
