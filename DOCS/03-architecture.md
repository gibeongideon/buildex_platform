# 03 — Architecture

## Stack

| Layer | Choice | Version |
| --- | --- | --- |
| Framework | Next.js, App Router | 16.3.3 |
| UI runtime | React | 19.2.8 |
| Language | TypeScript, `strict` | 5.x |
| Styling | Tailwind CSS with `@theme` tokens | 4.x |
| Primitives | Radix UI (dialog, checkbox, radio, switch, tooltip, separator, label, slot) | — |
| Forms | React Hook Form + Zod resolver | 7.x / 4.x |
| Icons | lucide-react | — |
| E2E tests | Playwright | 1.5x |

Chosen to match the storefront stack in `requirements_reference/STACK.MD`
(**Next.js + TypeScript + Tailwind**), so mockup components survive the backend cutover
rather than being thrown away.

### How the seam maps onto the intended production architecture

`STACK.MD` splits the backend in two, and each repository already sits on the right side of
that split. This is why the seam was worth building:

| Repository | Production owner |
| --- | --- |
| `MarketplaceRepo`, `ProductRepo`, `ManufacturerRepo`, `EnquiryRepo`, `OnboardingRepo` | Next.js API routes → **Odoo JSON-RPC** (transactional, low volume per request) |
| `InsightsRepo`, `CampaignRepo` | **FastAPI** service reading Odoo's Postgres (or a synced analytics store) — bulk aggregation, never call-by-call RPC |
| `browsingRepo` | Client-side today; a per-user store (Redis) in production |
| `parseRequirement` (Ask AI) | The Python **AI layer** the stack note describes — the deterministic matcher is a placeholder with the same signature |

The transactional/analytical split is not cosmetic: pulling analytics through RPC
call-by-call is exactly the mistake `STACK.MD` warns against, and having `InsightsRepo`
already separated means that never has to be untangled later.

---

## Directory layout

```text
app/
  (public)/               Corporate site — platform overview, supplier acquisition
  (account)/              The buying side — Chapter 9
    join/                 Customer registration, four steps, its own focused layout
    account/              The customer's own area — overview, and the sections
                          C2–C6 fill in
  (marketplace)/          Buyer-facing marketplace, with its own storefront chrome
    marketplace/          Home: search hero, category rail, panel row, demand grid
      ask/                Ask AI — plain-language sourcing (see below)
      search/             Faceted results (query and filters read from the URL)
      product/[id]        Listing detail, price-band calculator, enquiry form
      manufacturer/[id]   A supplier's own branded storefront (tier 2)
      manufacturers/      Supplier directory
      regions/            Delivery coverage by region
      top-ranking/        Leaderboard by real enquiry demand
      rfq/                Request for Quotation — one requirement, many suppliers
  connect/
    onboarding/           The nine-step wizard, with its own focused layout
    (portal)/             Manufacturer portal — dashboard, verification, catalogue,
                          enquiries, campaigns, insights, subscription, settings
  (admin)/                Buildex Admin — the internal console
    admin/                Overview, verification queue and reviewer, manufacturers,
                          listings, enquiries, campaigns, subscriptions, activity, team
  globals.css             Design tokens. The only file that hard-codes a colour.
  layout.tsx              Root layout, font, theme script, demo panel

components/
  ui/                     Primitives — button, form fields, cards, pills, chips
  shared/                 Composed, product-aware components

  Two of these are shared by *both* wizards, and were extracted the moment the
  second one needed them rather than copied:

  shared/step-frame.tsx   StepShell + StepSkeleton. Takes `backHref` as a plain
                          string, which is the one thing that used to tie it to
                          manufacturer onboarding
  shared/otp-field.tsx    The six-digit field, resend timer and demo hint
  shared/plan-picker.tsx  PlanCards / PlanComparison / BillingCycleToggle, over
                          any tier set — supplier packages or customer
                          memberships. See the note in the file

  Reach for these before writing a list screen — each replaced between five and
  sixty-six hand-written copies, and a new copy is how they drift apart again:

  ui/query-state.tsx      QueryError banner + skeleton helpers for a failed load
  ui/filter-bar.tsx       FilterBar (search + filters + "N of M") and SearchField
  ui/data-table.tsx       DataTable — the scroller, table and header row
  shared/breadcrumbs.tsx  Breadcrumbs — the trail; PageHeader renders it too
  shared/back-link.tsx    BackLink — one step up to the parent list
  shared/error-panel.tsx  The body of every error.tsx boundary

lib/
  schemas/                Zod schemas — the contract for the future database
  data/
    types.ts              Repository interfaces (THE SEAM)
    index.ts              Active implementation (THE SWAP POINT)
    mock/                 In-memory store + repository implementations
      latency.ts          FAST / NORMAL / SLOW — the one place they are set
    fixtures/             Kenyan seed data
    hooks.ts              React bindings — useQuery
  rules/                  Business rules, kept out of both schemas and components
  utils.ts                Formatting (KSh, dates, percentages) and small helpers

e2e/                      Playwright specs
DOCS/                     This documentation
requirements_reference/   Source requirement documents

AGENTS.md, CLAUDE.md      Auto-generated by Next.js 16 on first dev run — Next.js
                          conventions for AI coding agents, not project docs.
                          Disable with `agentRules: false` in next.config.ts.
```

Route groups (`(public)`, `(marketplace)`, `(portal)`, `(admin)`) do not appear in URLs.
They exist so each area can own its own layout while sharing one component library.
Splitting any group into its own deployable app later is a directory move — which matters
most for `(admin)`, the group most likely to end up behind a separate authentication
boundary.

The marketplace has its own group because its chrome is genuinely different from the
corporate site's: a promo strip, a dense utility bar carrying delivery region, messages,
lists, cart and account, then a navigation row with a full-width category mega menu. That
is the pattern the large B2B marketplaces converged on, and it is well-tested for this
job — the deviation is that delivery context asks for a *region* rather than a country,
since Buildex trades inside one.

---

## The data seam

**This is the most important design decision in the project.**

The mockup exists to be replaced by a real backend. That only stays cheap if the UI never
learns where its data comes from.

```text
Component  ──►  lib/data (repository interface)  ──►  mock implementation
                        │
                        └──► (Phase 9) Drizzle + Postgres behind route handlers
```

### Rules

1. Components import from `@/lib/data` and call repository methods. They never import a
   fixture, never touch `localStorage`, never reach into `lib/data/mock/`.
2. Every repository method is `async` and returns a Zod-inferred type. The signatures are
   already API-shaped, so nothing changes when they become network calls.
3. Repository calls carry 140–420 ms of artificial latency, set in one place —
   `lib/data/mock/latency.ts`. This is deliberate: it forces every screen to have a real
   loading state, so the swap to a networked backend does not surface a whole class of
   missing UI.
4. Business rules live in `lib/rules/`, not in components and not in schemas — so ops
   actions, demo controls and the wizard can never disagree about what the rules are.

### Interfaces

| Repository | Responsibility |
| --- | --- |
| `ManufacturerRepo` | List, fetch, create from draft, update, duplicate-PIN lookup, check transitions, document replacement, subscription |
| `ProductRepo` | Catalogue CRUD per manufacturer |
| `MarketplaceRepo` | Faceted search, listing detail, storefronts, related and comparable listings |
| `BrowsingRepo` | What this browser has viewed — powers the history and follow-up rails |
| `EnquiryRepo` | Quote requests: create, list, quote, status transitions |
| `CampaignRepo` | Regional visibility campaigns |
| `InsightsRepo` | Derived performance — see below |
| `OnboardingRepo` | Load, save and clear the in-progress application draft |
| `SessionRepo` | Which demo role and manufacturer is "signed in" — four internal roles, each owning a console section |
| `ActivityRepo` | The platform-wide timeline, filterable by kind, actor, supplier, date and text — derived, see below |
| `AdminRepo` | Cross-entity counts, the exceptions list, and the joined rows the console's tables need |
| `CustomerRepo` | The buying side: current customer, fetch, list, create from a registration draft, update, membership, demo sign-in |
| `RegistrationRepo` | Load, save and clear the in-progress registration — same functional-patch shape as `OnboardingRepo`, for the same reason |
| `OfferRepo` | Offers and member deals, resolved to live listings at the customer's own tier |

### Two rules the marketplace depends on

**Public visibility is decided in one place.** `publicListings()` in
`lib/data/mock/marketplace.ts` is the only function that decides what reaches the
marketplace: a listing must be `active` *and* its manufacturer must be cleared to list.
Search, storefronts, related products and comparables all build on it, so a verification
state can never leak a listing by accident. An unverified manufacturer has no public
storefront at all.

**The scope tabs behave two ways, on purpose.** Ask AI / Products / Manufacturers / Regions
are an *in-place switch* on the home page and *navigation* everywhere else — which is what
the reference marketplace does, and why its tabs read as tabs.

On `/marketplace`, choosing a tab changes the search field, the headline and the panels
below it without leaving: a buyer deciding what *kind* of thing they want has not committed
to a search yet, so sending them to another page for the answer is premature. The selection
lives in `HomeScopeProvider` (`components/marketplace/home-scope.tsx`), which the layout
mounts only on the home page — the hero sits in the layout and the panels sit in the page,
so the choice has to be shared. Deliberately not in the URL: `useSearchParams()` in a
layout opts the whole marketplace subtree out of static rendering.

Off the home page the same tabs navigate, and the active one is derived from
`usePathname()` rather than local state, so it stays correct on a page reached by any other
means (deep link, mega menu, a card). Switching carries the current `?q=` across, read from
`window.location.search` at click time for the same static-rendering reason. `useHomeScope()`
returning null is how the tab row tells the two situations apart.

**One supplier row, two surfaces.** `ManufacturerRow` renders the credentials-left,
product-strip-right layout used by both the home page's Manufacturers tab and the full
directory at `/marketplace/manufacturers`, so the shortlist and the directory can never
describe the same supplier differently. Its capability filters (`lib/rules/suppliers.ts`)
are predicates over real fields — certifications, the supplier's own response record,
delivery reach, payment terms, real MOQs — so a chip a buyer filtered on is the same claim
printed on the card. There are deliberately no star ratings: the platform has no reviews,
and a fabricated 4.8/5 would undermine every real number beside it.

**A strip spreads across categories.** `spreadBy()` in `lib/utils.ts` picks one item per
distinct category before repeating any. Four listings from one category show four
near-identical photos and tell a buyer nothing about a supplier's range; the same four tiles
spread across categories are informative. Shared by the supplier row and the home page's
thumbnail panels.

**One search field per page.** Two inputs sharing a label are ambiguous to a screen reader
and to keyboard users, so the layout's compact field renders in exactly one place and stands
down entirely on pages that carry their own — the home hero, Ask AI, the supplier directory
and a storefront.

**Ask AI is a matcher, not a model.** `lib/rules/sourcing.ts` parses a requirement
against the catalogue's own vocabulary — material synonyms, the 47 counties, quantities,
urgency and price sensitivity — and returns a structured filter. It is deterministic, works
offline, and can never invent a supplier or a price. The page shows exactly what it
recognised, so a buyer can see why they got those results and rephrase if something was
missed. When a real model is wired in at the cutover it replaces `parseRequirement`; every
surface downstream stays put.

**Insights are derived, never stored.** Views come from the campaigns that carried a
listing; enquiries and orders come from the enquiry records themselves. There is no
metrics table, so the insights page can never disagree with the inbox or the campaign
list — a class of bug that plagues dashboards built on their own aggregation.

**So is the activity feed.** `ActivityRepo` reads the timestamps already on every record —
`manufacturer.submittedAt` / `verifiedAt`, `check.startedAt` / `completedAt`,
`document.uploadedAt`, `product.createdAt` / `updatedAt`, `enquiry.createdAt` /
`respondedAt`, `campaign.startsAt` / `endsAt`, `subscription.startedAt` — and turns them
into 483 events spanning a year. Two consequences: the feed cannot disagree with the
records it describes, and anything a user does in the demo shows up in it with no event
plumbing to remember. Future-dated timestamps are filtered out, so a renewal date never
appears as something that already happened.

A check's actor follows its *authority*: document completeness and the site visit belong to
Buildex (`ops`), the BRS, KRA and IPRS lookups to `system`. That distinction is what lets
the Team page answer "what has Buildex actually done", which is the only question an
internal audit trail is for.

**Cross-entity counting happens once.** The overview needs figures that span manufacturers,
listings, enquiries and campaigns. Deriving those in the page would put business rules in
the UI and fire a repository call per entity, so `AdminRepo` builds one index in a single
pass — the same shape `publicListings()` already uses — and every figure and exception on
the console reads from it.

**Ops decisions are data, not branching.** `lib/rules/ops.ts` holds the four decisions
(approve, request info, flag for site visit, reject) and `checkChangesFor()` returns which
checks each one moves and to what. The reviewer renders that list *before* the click, so
the consequence is stated rather than inferred — on a screen where a wrong decision costs a
supplier days. Every decision then writes through `manufacturerRepo.setCheckStatus`, which
re-derives status via `deriveStatus()`; that is why the manufacturer's own tracker updates
with no extra wiring.

**Clearing a supplier publishes the drafts it was forced to park.** Three screens promise
this — the onboarding first-listing step, the manufacturer's verification tracker, and the
admin listings queue. `draftsToPublishOnClearing()` in `lib/rules/ops.ts` makes it true, and
`replaceManufacturer()` in the mock repository is the single write path that applies it, so
it happens however the status moved. It fires only on the transition *into* a listable state
from one where publishing was impossible: a draft created after clearing is the supplier's
own decision, and reinstating a suspended supplier never pushes anything live.

**Suspension outranks the pipeline.** `deriveStatus()` reads only the checks, so a later
check movement would silently un-suspend a suspended manufacturer. `isAdministrativeHold()`
is asked first by anything that writes status.

**Customers are seeded from the delivery history that already existed.**
`lib/data/fixtures/demand.ts` has generated a deterministic year of deliveries against a
fixed pool of buying shops since Phase 2 — county, quantity, value and date, priced
through each product's own bands. `lib/data/fixtures/customers.ts` seeds accounts from
that same `BUYERS` list, using the exported `buyerIdFor()` so the ids line up by
construction.

Three things fall out of that. A seeded customer has genuine commercial history on the day
the account screens ship, so the Trust Profile and spend analytics can be *derived* rather
than decorated. The shop a supplier sees in their existing repeat-buyer table is the same
record as the customer who placed the orders — one history, two sides, no way for them to
disagree. And when a real orders table arrives at the cutover the join is already
`customer.buyerId`.

The four consumer accounts after the trade buyers deliberately carry **no** history. A
homeowner who registered last week has no orders, and every account screen has to read
correctly for them too — that is the state every real new user starts in.

**Entitlements are one table, read three ways.** `ACCESS_MATRIX` in
`lib/schemas/membership.ts` is Chapter 9 §9.12 as data. The public pricing page, the
in-app upgrade screen and (from C2) `can()` all read it, and `MEMBERSHIP_PLAN_FEATURES`
maps it into the shape `PlanComparison` renders. The classic failure in a tiered product
is a pricing page promising what the gate does not grant, which happens the moment the
marketing table and the entitlement check are two lists. Here a row *is* the entitlement.

**A verification level is derived; membership is bought.** §9.42 is explicit that
"membership does not equal trust; trust is earned", so `deriveVerificationLevel()` in
`lib/rules/customers.ts` computes the level from what has actually been verified and how
much the account has traded. A Build Business subscriber who has verified nothing is still
`registered`. `strategic` is the one exception — it means a contractual relationship and
enhanced due diligence carried out by people, so it is an administrative grant that
outranks derivation, the same shape as `isAdministrativeHold()` on the supplier side.

**Offers resolve through `publicListings()`.** An offer names a category and optionally a
region rather than carrying its own prices, and `offerRepo.list()` drops any offer whose
category has nothing live behind it. So the rail can never advertise an empty shelf, and
suspending a supplier empties the offer along with the search results. A promotions table
with its own prices would be a second source of truth about what things cost.

**The customer level is a pill, not a new seal.** The scalloped mark in
`components/shared/verified-mark.tsx` means one specific thing here — Buildex checked a
company against BRS, KRA and IPRS. Minting three more seal variants for customer levels
would either dilute that or be mistaken for it. So a level reads as a `StatusPill`, and
the seal appears beside it only from `verified_member` up, where a real check has happened.

### Enforcement

The seam is only worth having if it is actually intact. Two greps verify it:

```bash
grep -rn "fixtures"  app/ components/     # must return nothing
grep -rn "data/mock" app/ components/     # must return nothing
```

If a component imports a fixture directly, the Phase 9 cutover stops being a one-file
change. Both currently return nothing.

### Reactivity

The mock store is local, so it can be reactive. `useQuery` in `lib/data/hooks.ts`
subscribes to a store version counter and re-runs its fetcher when data changes.

`loading` is **derived**, not stored — a result is stale exactly when the key it settled
against is no longer current. That gives stale-while-revalidate for free (previous data
stays on screen through a refetch instead of blanking) and keeps the effect free of
synchronous `setState`, which the React Compiler rejects.

---

## Backend cutover

At Phase 9, `lib/data/index.ts` is the only file that has to change:

```ts
// Today
export { manufacturerRepo, productRepo, onboardingRepo, sessionRepo } from "./mock/repos";

// Later — incrementally, one entity at a time
export { manufacturerRepo } from "./api/manufacturers";   // Drizzle + Postgres
export { productRepo }      from "./mock/repos";          // still mock
```

Recommended order:

1. **Generate Drizzle schemas from the Zod schemas** in `lib/schemas/`. Field names, enum
   members and validation rules there are the intended database contract — that is much of
   what the mockup was for.
2. **Implement route handlers** under `app/api/` that satisfy the repository interfaces.
3. **Flip one repository at a time.** They are independent, so `ManufacturerRepo` can be
   live while `ProductRepo` is still mock.
4. **Replace the verification stubs** with real BRS / IPRS / CRB adapters. Each becomes an
   adapter behind the same `VerificationCheck` record, so the UI does not move.
5. **Remove** `subscribeToData` and `resetDemoData` (and the demo panel) once nothing local
   remains.

Things to carry across deliberately:

- The onboarding draft is currently browser-local. In production it must be a server-side
  row, so "Save & exit" survives a device change. `OnboardingRepo` already has the right
  shape for this.
- `OnboardingRepo.save` accepts a **functional patch** (`(current) => patch`). Keep that:
  it is what stops concurrent saves clobbering each other, and the same hazard exists
  against a real API.

---

## Design system

All tokens live in `app/globals.css`. Rebranding means changing values in that one file.

**Source of truth:** `requirements_reference/BUILDEX BRANDING FULL.pdf` — Brand
Guidelines, August 2026.

### The brand palette

The guideline defines exactly three colours, and one digital usage rule.

| Role | Hex | CMYK | Share |
| --- | --- | --- | --- |
| Primary Blue | `#262E70` | C66 M59 Y0 K56 | 70% |
| Accent Yellow | `#FFDA03` | C0 M15 Y99 K0 | 20% |
| White | `#FFFFFF` | C0 M0 Y0 K0 | 10% |

> "Use blue for navigation and structure, with yellow for important actions."

That sentence is what the token families implement:

| Family | Colour | Used for |
| --- | --- | --- |
| `--brand-*` | Blue `#262E70` | Navigation, structure, selection, progress, links, focus rings, checked controls, avatars, step markers |
| `--primary-*` | Yellow `#FFDA03` | Primary call-to-action only |

Yellow is used sparingly and deliberately, so that on any given screen "yellow" reliably
means *this is the action*. Every neutral — surfaces, borders, body text — is mixed from
`#262E70` rather than taken from a generic grey ramp, so the whole interface carries the
brand's blue cast rather than merely quoting it in a logo.

### Yellow is a light colour — two consequences

Brand yellow has a relative luminance of **0.714**. It behaves like a light tint, not a
saturated accent, and two rules follow directly from that:

| Pairing | Ratio | Verdict |
| --- | --- | --- |
| `#262E70` on `#FFDA03` | 8.95:1 | Yellow CTAs carry **blue** text |
| `#FFFFFF` on `#FFDA03` | 1.37:1 | Never white text on yellow |
| `#FFDA03` against a white page | 1.37:1 | Fails non-text contrast (WCAG 1.4.11) |

So a light-mode yellow button carries a darkened-gold border, `#A38C02`, which is 3.33:1
against white and satisfies 1.4.11. In dark mode `--primary-border` resolves to
`transparent`, because yellow against the dark ground is already 14.4:1.

### Semantic colours

State only, never brand expression. **Warning is orange, not yellow** — deliberately
moved off the brand hue so that a warning can never be misread as a call to action.

| Meaning | Light | Dark |
| --- | --- | --- |
| success | `#0F7A3D` | `#8CBFA2` |
| warning | `#B23C0B` (orange) | `#E2A48A` |
| danger | `#B3261E` | `#DB9793` |
| info | `#262E70` (brand blue) | `#979BBA` |

### Product identity

The guideline's own lockup is "BUILDEX" in blue with the descriptor "INTERIORS" in
yellow. The three businesses follow that same construction — `BUILDEX · INTERIORS`,
`BUILDEX · CAPITAL`, `BUILDEX · CONNECT` — so they are distinguished by the descriptor
word, never by inventing a third or fourth colour. `PRODUCT_META` in
`components/shared/brand.tsx` holds the three.

### Logo

`BuildexMark` draws the house outline — chimney, asymmetric pitched roof, left wall,
floor, open right side — traced from the artwork and normalised to a `0 0 132 92`
viewBox, with every path inset by at least half the stroke width so nothing clips at
small sizes. `Wordmark` is the horizontal lockup used in application chrome; the master
artwork overlaps the wordmark with the house, which reads well at poster scale but
collapses in a 64px header.

Guideline constraints honoured: white or transparent backgrounds; the reversed white
variant on dark grounds; the descriptor never rendered below 10px; no stretching,
recolouring or shadows.

### Text and border contrast, measured

Three text levels, three border weights, all measured rather than eyeballed:

| Token | Light | On white | Dark | On dark surface |
| --- | --- | --- | --- | --- |
| `--fg` | `#1F265C` | 14.09:1 | `#F2F2F6` | 17.23:1 |
| `--fg-muted` | `#474D7A` | 8.04:1 | `#C4C7DA` | 11.48:1 |
| `--fg-subtle` | `#585D88` | 6.29:1 | `#A4A8C6` | 8.24:1 |
| `--border` | `#CBCDDD` | 1.58:1 | `#272D5D` | 1.48:1 |
| `--border-strong` | `#7F84A9` | 3.64:1 | `#6A70A0` | 4.07:1 |

The two secondary levels used to sit at 5.63:1 and 4.54:1. Both passed AA — the second by
0.04 — and the interface still read as faint, because AA's 4.5:1 is a floor written for
larger, well-spaced text and this product lives at 12–14px with uppercase labels. Borders
were worse: at 1.27:1 a card had no visible edge, so everything floated on one flat wash.

`e2e/admin.spec.ts` measures this in both themes on every run, resolving colours by
painting them onto a canvas rather than parsing the string — Tailwind v4 emits `oklab()`
for anything carrying an alpha modifier, and it composites translucent grounds the way a
reader actually sees them. Headings must clear 10:1, `muted` 7:1 and `subtle` 5.5:1.

### Top ranking is many leaderboards, not one list

Built the way the large B2B marketplaces build theirs: a page of small
leaderboards rather than one long ranking. "The top three roofing sheets
delivered to Nyanza" is a question a buyer can act on; "the 400th ranked product
overall" is not.

Two levels, mirroring that shape. With no category selected each block is a
category; select one and the blocks become the regions that category is actually
delivered to — the Kenyan equivalent of the reference site's global/region
switch, and the question a hardware shop actually has.

Every ranking is a number the platform already holds: enquiries received, entry
price, or quoted lead time. There is deliberately **no "best reviewed"** tab —
the marketplace has no reviews, and a star rating invented to fill a tab would
undermine the enquiry counts sitting next to it.

Blocks arrive six at a time behind an `IntersectionObserver` sentinel. That
sentinel is attached through a **callback ref, not an effect**: it does not exist
on the first render, because the page shows skeletons until the listings arrive.
An effect keyed on mount looked for a node that was not there, found null, and
silently never observed anything — the page stopped at six leaderboards and
looked complete. Progressive loading fails quietly, so it is asserted in the
suite rather than eyeballed.

### The marketplace groups by category, not one long grid

A single continuous grid of every listing makes a buyer scan forty unrelated products to
find the two they care about. The home page renders a rail per category instead — demand
first, then the deepest categories — and each rail scrolls sideways, so a category with
twelve products costs the same vertical space as one with three.

The arrows are an affordance, not the mechanism. Each rail is an ordinary scroll container,
so a trackpad, a touchscreen and the keyboard all work without them; the buttons are
`aria-hidden` and `tabIndex={-1}` precisely because exposing them would add two controls
that duplicate what the container already does natively.

Card design is unchanged — this is a grouping change, not a redesign.

### Comparison is driven by quantity, not price

On this marketplace a price is a set of quantity bands, not a number, so "who is
cheapest" has no answer until the buyer says how much they are buying — two suppliers can
each win at different volumes. `/marketplace/compare` therefore hangs off a quantity field,
re-prices every column through `priceAtQuantity()`, and marks the cheapest only once there
is a quantity to be cheapest *at*.

The other half is minimum order. A supplier whose MOQ is 100 cannot serve an order of 20 at
any price, so their column says "below their minimum" instead of showing a unit price the
buyer could never get. A comparison that quietly ignored MOQ would recommend suppliers who
would refuse the order.

Selection lives in `CompareProvider` context rather than the URL, because a buyer builds a
shortlist while moving between search, a listing and a storefront; losing it on navigation
would make the feature useless. The comparison page itself reads ids from the URL, so a
shortlist is still shareable.

### Colour that means something

The soft tints used to sit at 8% of their base over white, which measures 1.16:1 against
the page — technically a tint, visibly grey. The interface read as flat not because it
lacked colour but because the colour it had was too dilute to see. Each is now the deepest
tint that keeps its own foreground clear of 4.5:1 when set on it:

| Token | Light | On white | Its own text on it |
| --- | --- | --- | --- |
| `--brand-soft` | `#CFD1E0` | 1.52:1 | 8.11:1 |
| `--success-soft` | `#E5F0EA` | 1.17:1 | 4.65:1 |
| `--warning-soft` | `#F3E0D8` | 1.28:1 | 4.65:1 |
| `--danger-soft` | `#F0D4D2` | 1.40:1 | 4.69:1 |

The darker semantics reach that limit sooner than brand blue does, which is why they stay
paler — the constraint is the colour, not a design preference.

**`StatCard` carries a tone, and the tone carries meaning.** An overdue count is amber, a
breach red, a completion green, everything else brand blue. That is the difference between
an interface with colour and one that is merely coloured: a reader scans the KPI row and
knows where to look before reading a single number. The tone tints a small chip behind the
icon and nothing else, so the figure stays the loudest thing on the card.

Colour is never the only signal. Every toned figure also carries a label and a hint, so
nothing here depends on distinguishing amber from green.

### Foundation

- **Surfaces are separated by 1px borders, not shadows.** Shadows are reserved for true
  overlays. The border has to be visible for that to work, which is why `--border` is a
  measured value and not the lightest tint that still looked tidy.
- **Density:** 8pt grid, 40px controls, 44px dense table rows.
- **Blue dominance:** the 70/20/10 ratio is about brand expression, so the public site
  uses blue grounds (the `.on-brand` utility, e.g. the footer) while the portals stay
  light — inside a data application, legibility outranks brand dominance.

### Typography

The guideline lists three faces in order of prominence: **NEXA** (primary), **ARIAL**,
**MONTSERAT**.

| Role | Face | Why |
| --- | --- | --- |
| Display (`h1`–`h3`, wordmark) | Montserrat | Nexa is a commercial licence and is not bundled. Montserrat is also on the brand's approved list and is likewise a geometric sans, so it stands in until a Nexa licence is in place — swap `--font-display` when it is |
| Body, UI, data | Inter | Arial is the brand's second face — a neo-grotesque. Inter is the same skeleton drawn for screens: taller x-height, open apertures, wider default spacing, all of which lift legibility at the 12–14px sizes these tables live at. It ships true tabular figures and covers Latin Extended, so Kenyan county and company names render correctly. **Arial stays in the fallback stack**, so a failed webfont degrades to a brand-approved face rather than an arbitrary one |

The pairing — geometric display over neo-grotesque UI — is the most widely adopted
convention in current enterprise software, which is why it reads as credible to the
broadest audience without being conspicuous.

Scale: 12 / 14 / 16 / 20 / 24 / 30 / 38.

**One trap worth knowing:** `--font-display` is declared on `:root` and references
`--font-montserrat`. A `var()` inside a custom property resolves at the scope where that
property is *declared*, not where it is used — so the `next/font` variable class must go
on `<html>`, not `<body>`. Put it on `<body>` and every heading silently falls back to
Arial with no error anywhere.

### Tabular numerals

Every figure in this product is money, a percentage or a count, and they are read in
vertical columns. Numerals are tabular by default on `table`, `time` and `[data-numeric]`,
and money is rendered only through `<Currency>` — never as a bare number.

```tsx
<Currency value={1250000} />        // KSh 1,250,000
<Currency value={745} decimals />   // KSh 745.00
<Pct value={82} />                  // 82%
```

### Theming

An inline script in `<head>` resolves the theme before first paint, so the page never
flashes the wrong colours. `data-theme` is always resolved to an explicit `light` or
`dark` on `<html>` — including when the user's preference is "system" — which means the
CSS needs no media-query fallback and Tailwind's `dark:` variant has exactly one selector
to match.

The stored preference is read through `useSyncExternalStore`, so the toggle stays correct
across tabs.

### Wide content

Tables and other wide content scroll inside their own container via `.scroll-x`, never the
page. That utility includes `contain: paint`, which is load-bearing rather than
decorative — see [04 — Delivered](./04-delivered.md#defects-found-and-fixed).

---

## Conventions

| Concern | Convention |
| --- | --- |
| Money | Always `<Currency>`. Never a raw number, never a hard-coded "KSh " prefix |
| Forms | React Hook Form + `zodResolver`. The `Field` component wires label, hint, error and aria attributes together |
| Zod defaults | **No `.default()` on form-facing fields.** It makes the schema's input type diverge from its output type and breaks the resolver's generics. Put defaults in `defaultValues` |
| Validation shared between form and record | Factor the refinement into a named function and apply it to both schemas — see `refineBands` in `lib/schemas/product.ts` |
| Impure calls | Never `Date.now()` or `new Date()` in a component body. Move it to a module-scope helper (`lib/rules/`) |
| State from async data | Derive it during render from a nullable override, rather than syncing it in an effect |
| Loading states | Every async surface needs explicit loading, empty and error states. The artificial latency exists to make their absence obvious |
| Failed loads | Take `error` and `refetch` from `useQuery` and render `<QueryError>`. On a record page the error branch goes **before** the not-found branch: a failed request and a missing record are different answers, and "it may have been removed" about a record that exists is a false claim |
| Summary tiles | Derive KPI tiles from an unfiltered query, never from the filtered one that feeds the table. Only the "N of M" count beside the filter should move when a filter moves |
| Status labels and tones | One `*_LABELS` / `*_TONE` map per schema file, beside the status list — `PRODUCT_STATUS_LABELS` in `lib/schemas/product.ts` is the pattern. Never a local copy in a page |
| Union-typed filters | Hold filter state as the union (`Region \| ""`), not `string`, and convert DOM values with `asOption`, which checks membership. No `as never` |
| Section titles | Sections name themselves in a server `layout.tsx`; the client shell lives in its own file beside it, because a client component cannot export `metadata` |
| Accessibility | Keyboard-operable controls (the dropzone is a real `<button>`, not a drag-only div), `role="alert"` on validation errors, `aria-invalid` on failing inputs, skip links on every layout |

---

## Mock data

| Fixture | Count | Notes |
| --- | --- | --- |
| Manufacturers | 12 | Spread deliberately across every lifecycle status |
| Products | 24 | Wholesale KSh at realistic Kenyan market levels, banded by quantity |
| Counties | 47 | All of them, grouped into 8 regions so regional targeting rolls up |
| Product categories | 14 | Cement, steel, timber, paints, roofing, plumbing, electrical, … |
| Document types | 7 | 6 required + optional KEBS mark |

The status spread is intentional: the ops verification queue (Phase 3) and the marketplace
(Phase 4) both need something meaningful to render on day one, and Phase 1 needs an
existing KRA PIN (`P051234567M`, Savannah Cement Works) for the duplicate-detection path
to be walkable.

Data is persisted to `localStorage` under `buildex.mock.v9`. Bump that key when the shape
of seeded data changes, or old persisted data will win.

One thing worth knowing about that store: **the seed is only written to `localStorage` on
the first mutation.** A visit that reads but never writes leaves nothing persisted, so
anything trying to *patch* stored state has to write a partial object instead and let
`hydrate()` merge it over a fresh seed — which is what `signOut()` in
`e2e/customer-account.spec.ts` does.
