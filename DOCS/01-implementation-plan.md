# 01 — Implementation Plan

## Context

Buildex is moving from a product-centric interior and construction-supply business to an
integrated platform ecosystem built on three complementary businesses:

| Business | Primary role | Strategic asset |
| --- | --- | --- |
| **Buildex Interiors** | Product supply and distribution | Supply relationships, inventory, hardware network |
| **Buildex Capital** | Credit, financing and collections | Credit data, repayment history, financial products |
| **Buildex Connect** | Manufacturer marketplace | Manufacturer network, catalogue, market intelligence |

The strategic goal is to capture chain-level data from manufacturer → Buildex → hardware
shop → POS transaction → end consumer, and to use that data to improve credit decisions,
inventory recommendations and manufacturer market intelligence.

### What we are building now

A fully clickable, enterprise-grade **mockup** of the whole ecosystem — real screens, real
interactions, real state, but backed by an in-process mock data layer instead of a
database.

The purpose is twofold:

1. **Lock UX, information architecture and the data model before backend work starts.**
   Screens are cheap to change now and expensive to change after the schema is live.
2. **Give management something concrete to decide against.** The requirements document
   lists nine decisions still open (§17: pilot limits, wallet architecture, manufacturer
   packages, first release scope). A working demo is a better basis for those decisions
   than a document.

### Where we started, and why

**Buildex Connect manufacturer onboarding.** It is the ecosystem's first real intake
funnel, and it exercises the hardest shared primitives — multi-step wizard with resumable
state, document upload, KYB verification states, approval workflow — that every later
module reuses. Getting these right once means Phases 3–6 inherit them.

### Non-goals for the mockup

No database, no authentication, no M-Pesa, no Odoo, no CRB/BRS/IPRS calls. Every one of
those is stubbed behind an interface designed to be **swapped, not rewritten**.

---

## Decisions taken

| Decision | Choice | Rationale |
| --- | --- | --- |
| Codebase layout | One Next.js app, route groups per product, one shared design system | Fastest to build, demos on one domain; splitting a group into its own deployable app later is a directory move, not a rewrite |
| Phase 1 scope | Design system + app shell + complete manufacturer onboarding journey | Tight, demo-ready slice that de-risks the primitives everything else needs |
| Visual direction | The official brand palette — `#262E70` blue, `#FFDA03` yellow, white | Adopted from `BUILDEX BRANDING FULL.pdf`. Blue for navigation and structure, yellow for important actions, per the guideline's own digital rule |
| Stack | Next.js + TypeScript + Tailwind + Zod, per the stack recommendation | Matches the chosen production stack, so mockup components survive the cutover |
| Mock data strategy | Repository interfaces with an in-memory implementation | Makes the backend cutover a one-file change rather than a rewrite |

---

## Phases

Each phase is independently demo-able.

### Phase 0 — Foundation ✅ Done

Scaffold, design tokens, type scale, app shell, navigation, breadcrumbs, dark mode,
shared component library, repository interfaces, mock store, Kenyan seed data, demo panel.

**Done when:** a portal shell renders in light and dark, navigation works, store survives
a reload.

### Phase 1 — Buildex Connect: Manufacturer Onboarding ✅ Done

The full nine-step journey (Journey A), including rejection/resubmit, duplicate
registration, expired document and conditional-approval edge states.

**Done when:** a user completes account → KYB → documents → verification → package →
first listing → dashboard, can resume mid-wizard after a refresh, and the rejection path
is walkable.

### Phase 2 — Buildex Connect: Marketplace & Manufacturer Portal ✅ Done

The two-tier marketplace — a central catalogue of every published listing, and a branded
storefront per manufacturer carrying only their range — plus the portal a manufacturer
runs it from: catalogue CRUD with price bands and MOQ, enquiry inbox with quoting,
regional targeting campaigns with priced reach, derived performance insights, and
editable company settings.

Deferred from this phase: bulk CSV price-list import.

### Phase 3 — Buildex Console: Ops & Verification

Verification queue with SLA ageing, document reviewer (document alongside extracted
fields), approve / reject-with-reasons / request-more-info / flag-for-site-visit,
manufacturer and hardware directories, subscription administration, audit trail.

Closes the Connect loop end-to-end against Phase 1: a manufacturer submits, ops decides,
the manufacturer's tracker updates.

### Phase 4 — Buildex Interiors: Hardware Shop Portal & Supply

Hardware onboarding (KYB plus owner ID verification), marketplace browse/search/filter by
region and category, product detail with tiered pricing, cart and order placement, order
tracking, delivery notes, inventory and stock-movement views.

### Phase 5 — Buildex Capital: Hardware-Facing Credit

Wallet ledger (collections, disbursements, repayments, fees, reversals), credit
eligibility tracker (6-month membership, ≥80% turnover through platform, KYB, CRB),
credit application, offer with tenor choice (5 / 10 / 14 days) and disclosed pricing,
active loan tracker with due dates and DPD, repayment (manual and auto-sweep
visualisation), statements, cash-conversion-cycle insight.

### Phase 6 — Buildex Capital: Internal Credit & Risk Console

Credit scoring engine UI over the requirement's model input groups — platform activity,
turnover, stock, cash flow, credit behaviour, external risk, business profile,
fraud/anomaly — producing score → risk grade → recommended limit and tenor. Underwriting
queue with approval thresholds and overrides, portfolio dashboard (outstanding,
utilisation, DPD buckets, NPL, expected collections, write-offs), collections workflow
across the 37-day recovery hypothesis, pilot metrics dashboard.

### Phase 7 — Public Marketing Site 🟡 Partial

Entry pages exist (`/` and `/manufacturers`). Remaining: per-product pages for Buildex
and Buildex Capital, and a hardware-shop acquisition page funnelling into Phase 4.

### Phase 8 — Consumer Intelligence

Consumer segments, next-stage purchase recommendations, consent-gated SMS campaign
builder with store deep-links, regional trend and product-velocity dashboards.

### Phase 9 — Backend Integration Cutover

Drizzle schemas generated from the Phase 0 Zod schemas, Postgres, route handlers
implementing the repository interfaces, real authentication, M-Pesa, Odoo, then
BRS/IPRS/CRB adapters replacing the verification stubs.

Flip `lib/data/index.ts` one repository at a time — see
[03 — Architecture](./03-architecture.md#backend-cutover).

---

## Sequencing rationale

The requirements set out an operating principle for the next phase:

> data → payment visibility → credit policy → controlled credit pilot → measured
> repayment outcomes → marketplace expansion → consumer intelligence

The build order above deliberately front-loads **Connect** (Phases 1–3) ahead of
**Capital** (Phases 5–6), which inverts part of that sequence. The reason is that Connect
is the only part of the ecosystem with no regulatory dependency and no external data
dependency — it can be built and shipped while the credit-policy expert and legal counsel
are still being engaged, rather than waiting on them.

Capital's screens are designed in Phase 6 but should not go live until the regulatory
workstream closes. See [05 — Next Steps](./05-next-steps.md#blockers).

---

## Requirements traceability

Where each prioritised module from the requirements lands in this build.

| Priority | Module | Phase | Status |
| --- | --- | --- | --- |
| P0 | Credit Scoring Engine | 6 | Not started |
| P0 | Loan Tracker | 5–6 | Not started |
| P0 | Wallet & Payments | 5 | Not started |
| P0 | POS / Transaction Data | 4–5 | Not started |
| P1 | Hardware Portal | 4 | Not started |
| P1 | Manufacturer Portal | 1–2 | **Done** — onboarding, marketplace, catalogue, enquiries, campaigns, insights |
| P1 | Admin / Risk Dashboard | 3, 6 | Not started |
| P2 | Consumer Intelligence | 8 | Not started |

Specific requirements addressed in Phase 1:

| Requirement | Where it lives |
| --- | --- |
| Collect KRA/tax information and BRS registration documents | `lib/schemas/document.ts` — seven-document KYB pack |
| Verify business information through authoritative sources | `lib/schemas/verification.ts` — five-check pipeline (completeness, BRS, KRA, IPRS, site visit) |
| Physical verification for higher-risk manufacturers | `lib/rules/onboarding.ts` — `requiresSiteVisit()` |
| Maintain manufacturer status, verification date, documents, review history | `lib/schemas/manufacturer.ts` — the stored aggregate |
| Subscription packages (Free / Basic / Premium / VIP) | `lib/schemas/subscription.ts` + `components/shared/package-picker.tsx` |
| Regional targeting | `REGIONS` and 47 counties in `lib/schemas/common.ts`; campaigns in Phase 2 |
| Prevent "ghost companies" | Duplicate KRA PIN detection, shareholding must reconcile to 100%, IPRS director check |
