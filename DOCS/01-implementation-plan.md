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

### Phase 3 — Buildex Admin: Ops & Verification — **delivered**

Verification queue with SLA ageing, the reviewer (declared company, directors with
shareholding reconciliation, KYB documents), and the four decisions — approve /
reject-with-named-documents / request-more-info / flag-for-site-visit. Plus manufacturer
directory with suspend and reinstate, listing moderation, platform-wide enquiry oversight,
campaign pause/resume, subscription administration, a filterable activity timeline, and
team & roles.

Closes the Connect loop end-to-end against Phase 1: a manufacturer submits, ops decides,
the manufacturer's tracker updates and the listings they were holding go live. The demo
scenario buttons that used to advance verification from the manufacturer's own screen are
retired — with a real ops actor, two ways to move the same records is how the two end up
disagreeing.

**Deliberately not in this phase:** the credit portfolio, loan tracker, DPD/NPL buckets,
wallet reconciliation and the §15 pilot metrics. None of that data exists yet, and the
requirements are explicit that credit figures must not be invented. Those arrive with
Phases 5–6, and the console says so on its overview rather than showing an empty shell.

The hardware-shop directory also waits: hardware shops are Phase 4, so there is nothing
to direct yet.

### Phase 4 — Buildex Interiors: Hardware Shop Portal & Supply — **superseded by C4**

This phase planned a separate `/shop/*` portal for hardware shops. Chapter 9 replaced that
premise: a hardware shop is a **customer** with a business type and a business membership,
not a different species of user. Its scope — cart, order placement, order tracking,
delivery notes — now lands in **C4** against the one `Customer` record. Inventory and
stock-movement views stay out until Phase 8 needs them.

Two account types would have meant two registrations, two wallets and two dashboards to
keep in step, and the first thing to drift would have been the entitlements.

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

## Chapter 9 — the Trust Engine & the customer front end

`requirements_reference/BUILDEX CONNECT FRONT END CHAPTER 9.docx` specifies the buying
side of Buildex Connect as a **trust engine** behind a search-first front door:

```text
IDENTIFY → VERIFY → PARTICIPATE → TRANSACT → LEARN → BUILD TRUST → UNLOCK VALUE
```

Phases 0–3 built the selling side. Every verb after `PARTICIPATE` needs an identified
customer, and there was none — so almost the whole chapter was unbuilt. These phases add
it, each independently demo-able, each behind the existing seam.

### Decisions taken

| Decision | Choice | Rationale |
| --- | --- | --- |
| Customer identity | One typed `Customer` carrying `customerType` | §9.4 makes customer type a *field*, not a product. A hardware shop is a customer with business verification and a business membership |
| Commerce depth | Full — cart, checkout, per-supplier orders, delivery | §9.32's chain ends `QUOTE → ORDER → TRANSACTION → TRUST`; trust needs transaction history to be real rather than asserted |
| FundiSmart | Its own late phase (C7), with the data shape and search scope designed in C1 | The tab row is the marketplace's top-level IA; retrofitting a category of thing into it later is worse than an honest placeholder |
| Trust Score | Composed from held signals and always itemised | `lib/rules/suppliers.ts` refuses invented ratings because the platform has no reviews. §9.21 also requires the methodology to be "understandable and reviewable" |
| Free discovery | Stays free | §9.40: "Do not charge simply for basic discovery." The gate applies only to *new* premium surfaces, never to what is public today |

### Phases

| Phase | Scope | §9.39 |
| --- | --- | --- |
| **C1 — Identity ✅ Done** | The `Customer` record and registration; four verification levels derived, never bought; the account area; the Chapter 9 front door with the customer promise, the three-step entry journey and the offers rail; recent searches; the Services scope scaffolded | 1 |
| C2 — Membership & the gate | `MEMBERSHIP_TIERS` and `ACCESS_MATRIX` (§9.12), `can()` in `lib/rules/access.ts`, the access-gate component, member pricing (§9.27), member deals | 2a |
| C3 — Wallet & tokens | Wallet (cash, tokens, ledger, statements), the KES 25 token engine — purchase, allocation, consumption, expiry, grants, refunds, audit | 2b |
| C4 — Commerce | The buyer quote inbox the RFQ page already promises, cart, checkout, one `Order` per supplier, delivery tracking, authorized users and purchasing controls (§9.5) | 3 |
| C5 — Trust | `lib/rules/trust.ts`, the customer Trust Profile and Prestige Profile (§9.20–9.21), the Buildex Supplier Score (§9.19) | 4 |
| C6 — Intelligence | Personalisation (§9.26), "alternative to 18mm MDF" (§9.17), procurement analytics, the Business Passport (§9.22), the §9.35 KPI set | 5 |
| C7 — FundiSmart | The professionals directory, service search and service enquiries | 5 |

**Financial enablement (§9.39 phase 6) is not a new phase.** Credit-readiness and
financing are Phases 5–6 above, and they stay blocked on the regulatory review recorded in
[05 — Next Steps](./05-next-steps.md#blockers). C5 and C6 feed them; nothing here unblocks
them, and the Business Passport must not imply a credit decision.

### What C1 shipped

| Requirement | Where it lives |
| --- | --- |
| §9.3 three-step entry journey | `components/marketplace/entry-steps.tsx` |
| §9.4 account fields — email, phone OTP, physical address, county/town, customer type | `lib/schemas/customer.ts`, `app/(account)/join/**` |
| §9.4 business information "progressive / required for business tiers" | `customerProfileStepSchema`'s `superRefine`, one place |
| §9.6 four verification levels | `deriveVerificationLevel()` in `lib/rules/customers.ts`, shown by `components/shared/account-level.tsx` |
| §9.2 customer promise, six verbs, public offers | `app/(marketplace)/marketplace-shell.tsx`, `lib/schemas/offer.ts`, `OfferRepo` |
| §9.16 customer dashboard | `app/(account)/account/page.tsx` |
| §9.17 service search scope | `components/marketplace/search-hero.tsx`, `ServicesSurface` |
| §9.26 recent searches | `BrowsingRepo.recordSearch` / `recentSearches` |
| §9.7–9.12 tier definitions and the access matrix | `lib/schemas/membership.ts` — declared in C1 because registration needs a real comparison; the gate that reads it is C2 |

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
| P1 | Hardware Portal | C4 | Not started — superseded, see Chapter 9 above |
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
