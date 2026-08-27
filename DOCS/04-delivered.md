# 04 — Delivered

Covers Phase 0 (Foundation), Phase 1 (manufacturer onboarding), Phase 2
(the marketplace and manufacturer portal) and Phase 3 (Buildex Admin).

## Summary

| Metric | Value |
| --- | --- |
| Source files | 107 (`app/`, `components/`, `lib/`, `e2e/`) |
| Routes | 43 (plus `/_not-found`) |
| Onboarding steps | 9, all resumable and deep-linkable |
| Seeded manufacturers / products | 16 / 72 |
| Seeded enquiries / campaigns | 50 / 12 |
| Derived activity events | 469, spanning a year |
| Bundled product photos | 22 across 13 categories (CC / public domain) |
| End-to-end specs | 35, all passing |
| TypeScript | `tsc --noEmit` clean |
| ESLint | 0 errors, 6 warnings (all upstream) |
| Production build | Clean |

---

## Phase 0 — Foundation

### Design system

`app/globals.css` — the complete token set, built on the official brand palette from
`requirements_reference/BUILDEX BRANDING FULL.pdf`: Primary Blue `#262E70`, Accent Yellow
`#FFDA03`, White. Blue carries navigation and structure, yellow carries important actions,
per the guideline's explicit digital rule. Every neutral is mixed from `#262E70`. Light and
dark palettes, type scale, radii, one overlay shadow, tabular numerals by default,
reduced-motion handling. See
[03 — Architecture](./03-architecture.md) for the full palette and the accessibility
maths behind it.

### Component library

**Primitives** (`components/ui/`)

| File | Provides |
| --- | --- |
| `button.tsx` | `Button` with primary / secondary / ghost / danger / link variants, four sizes, `loading` state that announces itself via `aria-busy` |
| `field.tsx` | `Field`, `Label`, `FieldHint`, `Input`, `Textarea`, `Select`, `MoneyInput` — label, hint, error and aria wiring in one place |
| `primitives.tsx` | `Card` family, `Separator`, `StatusPill`, `Alert`, `Checkbox`, `CheckboxRow`, `RadioGroup`, `Switch`, `ChipGroup`, `InfoTip`, `Skeleton`, `EmptyState` |

**Composed** (`components/shared/`)

| File | Provides |
| --- | --- |
| `app-shell.tsx` | Portal shell: fixed sidebar on desktop, focus-trapped slide-over on mobile, skip link |
| `brand.tsx` | `BuildexMark`, `Wordmark`, product metadata |
| `theme.tsx` | Pre-paint theme script and the light/dark/system toggle |
| `stepper.tsx` | `StepRail` (desktop) and `StepProgressBar` (mobile) |
| `file-dropzone.tsx` | Keyboard-operable drag-and-drop with type and size validation |
| `document-card.tsx` | One KYB document with status, expiry, replace and remove |
| `verification-tracker.tsx` | The five-check pipeline with authority and SLA countdown |
| `package-picker.tsx` | Billing toggle, package cards and comparison matrix |
| `product-thumb.tsx` | Product imagery: bundled category photo, or a generated tile |
| `product-card.tsx` | The marketplace card — price range, MOQ, traction, trust line |
| `page-header.tsx` | `PageHeader` with breadcrumbs |
| `format.tsx` | `Currency`, `Num`, `Pct`, `DetailRow` |
| `stat-card.tsx` | A single figure with label and hint |
| `demo-panel.tsx` | Global demo controls |

### Data layer

Zod schemas (`lib/schemas/`) covering common primitives and reference data, documents,
verification, subscription, product and the manufacturer aggregate — roughly 1,000 lines
that are the intended database contract.

Repository interfaces, the swap point, the in-memory store with `localStorage` persistence
and cross-tab sync, and Kenyan seed data.

---

## Phase 1 — Manufacturer onboarding

The full nine-step journey. See [02 — User Journeys](./02-user-journeys.md) (Journey A) for
the screen-by-screen walkthrough.

### Highlights worth calling out

**Live registry lookup.** The KRA PIN is checked on blur, not on submit, so an applicant
finds out about a collision before filling in the rest of the form. The lookup is
deliberately the slowest mock call in the app (420 ms) — an instant result reads as fake.

**Shareholding must reconcile.** Directors' ownership has to total 100%, with a running
total showing over/short by how much. A CR12 that does not add up is the commonest signal
of a fabricated company structure, so it is checked before anything else.

**Risk-based site visits.** `requiresSiteVisit()` triggers enhanced due diligence for
companies registered within two years or declaring under KSh 5M monthly output. A current
KEBS Standardisation Mark waives it — a regulator has already been on site.

**Conditional approval as a first-class state.** A manufacturer whose only outstanding
check is the site visit may list products but may not transact. Modelling this as its own
status (rather than a flag) keeps the rule in one place: `canListProducts()` and
`canTransact()`.

**Status derived, never set.** `deriveStatus(checks)` is a pure function over the check
pipeline, so ops actions and demo controls cannot drift out of sync with each other.

**Targeted resubmission.** A rejected check names the documents blocking it. Only those
need replacing; re-uploading returns the affected checks to the queue automatically.

**The preview is the real component.** The buyer preview beside the listing form is the
same component the marketplace renders. A preview that drifts from the real thing is worse
than no preview.

---

## Phase 2 — Marketplace and manufacturer portal

### The two-tier marketplace

**Tier 1 — the central catalogue.** `/marketplace` is the storefront home: a search hero
with Ask AI / Products / Manufacturers / Regions scopes, a full-width "All categories" mega menu,
a category rail with live counts, browsing-history and follow-up rails, a demand-ranked
grid, the supplier list and regional coverage. `/marketplace/search` is the faceted result
set — live facet counts, category and delivery-region filters, five sort orders, removable
chips, and query plus filters read from the URL so every entry point can deep-link into a
pre-filtered view.

The default order is **by demand** — how many enquiries each listing has attracted — so
cement and rebar lead the page rather than whatever happens to be alphabetically first.

Around it sit the pages the navigation promises: `/marketplace/manufacturers` (supplier
directory), `/marketplace/regions` (delivery coverage), `/marketplace/top-ranking`
(leaderboard by real enquiry volume) and `/marketplace/rfq` (Request for Quotation — one
requirement matched to every supplier who makes that category *and* delivers to that
region, creating a real enquiry for each).

**Tier 2 — `/marketplace/manufacturer/[id]`.** Each supplier's own branded page carrying
only their range, with in-store search, category filter and sort; a banner with their
trading record; and panels for terms, certifications and verification status.

The storefronts use the Buildex Connect palette rather than per-supplier colours. Buyers
should read a store as a verified page *inside* the platform, not an off-site website —
and 200 storefronts in 200 colour schemes would turn the marketplace into a riot. What
differentiates one store from another is substance: range, terms, trading record.

**`/marketplace/product/[id]`** is where the two tiers meet. The price-band table is
interactive: type the quantity you actually want and it highlights the band you fall
into, shows the unit price and the line total. From there the navigation goes up to the
supplier's store and sideways to comparable listings from other suppliers, cheapest first.

### The mega menu

Hovering "All categories" opens a panel spanning the full width of the viewport: the
category rail on the left, the hovered category's real listings on the right with prices,
plus its suppliers and delivery regions. It opens on hover with a short close delay so a
diagonal mouse path into the panel does not dismiss it, and on click for keyboard and
touch; Escape and mouse-away both close it.

Because it renders real listings, a category with three products says three. That is more
useful than a padded grid.

### Card typography

The type scale follows the reference card, because the hierarchy is doing real work in a
six-across grid:

| Element | Size / weight |
| --- | --- |
| Title | 14px / 400, two lines |
| Price range | 20px / 700 — `KSh 712-745`, tight hyphen, symbol once |
| MOQ line | 13px, value in foreground, enquiry count muted beside it |
| Trust line | 12px — `Verified · 17 yrs · Machakos` |

The title is deliberately *regular* weight. Bolding both the name and the price gives the
eye nowhere to land, and price is what a buyer scans a wholesale grid for. The upper bound
of a range drops the `KSh` — repeating it is what makes one range read as two numbers.

### Layout: full-bleed, six across, no sidebar

Containers run to 112rem (1792px) so the grid reaches nearly edge to edge on a 1900px
display, with a seventh column above 1700px. Results and the home grid run six across, with refinement in a
horizontal bar that expands into a panel. A permanent left rail would cost roughly two
columns of listings, and buyers scanning a grid want density far more often than facets.
The header collapses on scroll into a compact bar carrying the logo and an inline search —
driven by a sentinel plus `IntersectionObserver`, so it costs nothing per frame.

### Product imagery

22 photographs across 13 categories, bundled in `public/products/` under CC and
public-domain licences (`ATTRIBUTION.json` records source, creator and licence for each).
They are served locally rather than hotlinked, so the marketplace works offline and no
third-party CDN is loaded on every page view.

Several photos per category matters: a six-across grid filtered to one category would
otherwise repeat the same image straight down a column. Which one a listing gets is chosen
by a stable hash of its id.

Two deliberate limits. Glass & Glazing has no photograph that genuinely reads as the
product, so it falls back to a generated tile — the category icon over one of four
patterns, also seeded from the product id. And candidate photos showing *people working*
rather than the product were rejected: in a grid of product shots, a photo of a person
reads as an error. A wrong photo is worse than an honest placeholder.

### The scope tabs

Ask AI / Products / Manufacturers / Regions are real navigation: each maps to a route, the
active one is derived from the URL, and switching carries the query across. The row shows
large in the home hero and as a slim bar on every other page, so the four surfaces are
always one click apart.

The hero's search box is two rows, matching the reference: the term gets a full-width line,
with a category scope selector and the action beneath it. Choosing a category there carries
into the results as `?category=`.

The Regions tab searches too — `?q=` filters the region cards by region or county name, and
falls back to "which regions have listings matching this" when the term names a product
rather than a place.

### Ask AI

`/marketplace/ask` takes a requirement in plain language — "400 bags of cement delivered to
Machakos" — and returns the listings and suppliers that match, priced at the stated
quantity against a real band.

It is a deterministic matcher over the catalogue's vocabulary, not a language model, and
the page says so. It shows its working: the chips under the answer are exactly what it
recognised (`cement`, `Machakos`, `400 units`), so a buyer can see why they got those
results. Urgency sorts by lead time; price sensitivity sorts by price.

### The manufacturers tab

`/marketplace/manufacturers` lists suppliers as wide rows rather than cards: identity,
capability tags and trust metrics on the left, a strip of that supplier's actual products
in the middle, entry price and actions on the right. Filterable by category and delivery
region, sortable by range depth, responsiveness or years trading.

### Manufacturer portal

| Page | What it does |
| --- | --- |
| `/connect/catalogue` | List, search and filter the range; archive and restore; package listing caps enforced |
| `/connect/catalogue/new` and `/[id]` | Create and edit, sharing `ListingForm` with the onboarding wizard |
| `/connect/orders` | Enquiry inbox, newest first, with a quote panel pre-filled from the buyer's own quantity band |
| `/connect/campaigns` | Regional targeting: pick regions, see shop coverage and blended CPM, and projected enquiries *before* committing budget |
| `/connect/insights` | Most viewed, most enquired, demand by region, and listings drawing views but no enquiries |
| `/connect/settings` | Editable storefront copy, categories and regions; verified registry details are read-only |

Every previously-scaffolded route now carries real mock data. There are no "coming soon"
placeholders left in the product.

### One form, three places

`ListingForm` is used by the onboarding wizard's first listing, catalogue create and
catalogue edit. One component means the price-band rules, field order and live buyer
preview are identical wherever a manufacturer lists something — a product added on day
one looks the same as one added a year later.

---

## Phase 3 — Buildex Admin

Before this phase, everything built was one of two things: a manufacturer running their own
storefront, or a buyer browsing the marketplace. Nobody inside Buildex had a place to stand,
which left the Connect loop open at exactly the point the requirements care most about —
verification only advanced through demo buttons on the manufacturer's own page.

### The nine sections

| Route | What it answers |
| --- | --- |
| `/admin` | Eight KPIs, then the exceptions panel and the recent timeline |
| `/admin/verification` | What is about to breach SLA — the queue, ordered by risk not arrival |
| `/admin/verification/[id]` | Does the paperwork support the claim, and what does each decision do |
| `/admin/manufacturers` | Every supplier in any state; suspend and reinstate |
| `/admin/manufacturers/[id]` | One supplier: company, catalogue, enquiries, campaigns, verification, history |
| `/admin/listings` | All 72 listings including drafts; which are held behind verification |
| `/admin/enquiries` | Who is answering and who is not, platform-wide |
| `/admin/campaigns` | Spend, delivery and conversion; pause and resume |
| `/admin/subscriptions` | Who is on what, what renews when, and the account-managed override |
| `/admin/activity` | The full timeline, filterable and grouped by day |
| `/admin/team` | The two internal roles and what each is for |

### Decisions worth calling out

**Exceptions come before the feed.** A timeline says what happened; an exceptions list says
what to do. The overview leads with the second: checks past SLA, applications sitting in
`action_needed`, expired documents, and enquiries left longer than the supplier's own
advertised response time. Every row links to the record it is about.

**Response time is measured against the supplier's own promise, not a flat platform SLA.** A
hardware shop partly chose them on "replies within 3h", so that is the number worth holding
them to — and it is the number the enquiries console shows beside every wait.

**The reviewer states the consequence before the click.** Selecting a decision renders the
exact checks it will move, to what status, and the resulting manufacturer state. Rejection
will not record until the reviewer has named at least one document *and* written a note,
because the manufacturer's targeted-resubmit flow is built to ask for exactly what was
ticked.

**Suspension is an administrative hold, not a derived state.** `deriveStatus()` reads only
the checks, so a later check movement would have silently un-suspended a suspended supplier.
`isAdministrativeHold()` now outranks the pipeline, and reinstating recomputes from the
checks so a previously verified supplier comes back verified rather than resetting to
submitted.

**The demo scenario buttons are gone.** With a real ops actor, two ways to move the same
records is how the two end up disagreeing. What replaces them on the manufacturer's own
verification screen is a signpost to the reviewer, honest about being a prototype shortcut.

**Four internal roles, each owning a section.** Operations (John Gitahi) owns the
verification queue; Risk & Compliance (Daniel Otieno) owns the audit trail; Commercial &
Accounts (Franklin Wanyama) owns subscriptions and campaigns; Supplier Support (Mercy
Chebet) owns enquiries. That is the test for adding a role — a role owning no screen is an
org chart, not a permission model — and no responsibility appears under two of them, which
a spec asserts. The switcher changes the view, not permissions, and the console says so on
every page.

**Credit pages are absent on purpose.** The requirements list an Admin / Risk dashboard with
portfolio monitoring at P1, and none of that data exists yet. The overview says so in
writing rather than showing an empty shell — the requirements are explicit that credit
figures must not be invented.

### Four more applications in the seed

The real status spread left only three applications in flight, which made the queue look
like a screen nobody needs. Four more were added — all unverified, so they add nothing to the
marketplace and do not touch the eight suppliers whose 66 listings are live. What they add is
the states that are easy to get wrong:

| Supplier | State | What it exercises |
| --- | --- | --- |
| Meru Pipe Works | In review | A KRA check 60h past its 24h target — the row the queue must lead with |
| Malindi Blocks | In review | A site visit running alongside an unfinished desk check |
| Kitui Lime | Action needed | Shareholding declared at 95%, plus an expired KEBS permit |
| Bungoma Ceilings | Submitted | Every check still pending — nobody has picked it up, and no SLA clock has started |

Their storefront trading figures are zeroed rather than scaled off company age, the same way
`createFromDraft` starts a real new manufacturer: a supplier never cleared to sell has no
response record to advertise, and the enquiries console reads exactly that number.

---

### The scope tabs, revisited

They shipped as pure navigation: clicking one left the home page for that surface. Measured
against the reference marketplace, that was wrong — its tabs are an in-place switch, and
staying put is the point. Clicking "Manufacturers" there changes the field, the headline and
the content below it, and you only leave once you actually search.

The home page now does the same. Each surface is real:

| Tab | What it shows in place |
| --- | --- |
| Products | The catalogue: category rail, panel row, demand grid |
| Manufacturers | Every verified supplier, credentials beside a strip of their own listings with prices and minimum orders, filtered by real capability chips |
| Regions | All eight regions with listing and supplier counts counted from the catalogue |
| Ask AI | The sourcing examples, and a plain statement that it is a matcher rather than a chatbot |

The supplier row is shared with the full directory, so the shortlist and
`/marketplace/manufacturers` cannot drift. Off the home page the tabs still navigate — a
spec now covers both behaviours, and that the strip spreads across categories rather than
repeating one photo.

---

## Verification

### End-to-end (`npm run test:e2e`)

```text
manufacturer-onboarding.spec.ts
  ✓ a manufacturer can complete onboarding end to end
  ✓ a duplicate KRA PIN blocks the company step
  ✓ an expired document keeps the pack incomplete
  ✓ a draft resumes at the right step and clamps deep links

marketplace.spec.ts
  ✓ the central marketplace searches, filters and sorts
  ✓ a listing links through to its manufacturer's own storefront
  ✓ an enquiry sent from a listing reaches the manufacturer's inbox
  ✓ an unverified manufacturer has no public storefront
  ✓ a manufacturer can add a listing from the catalogue
  ✓ the marketplace home carries the full storefront chrome
  ✓ the All categories mega menu opens on hover and links through
  ✓ a request for quotation reaches every matching supplier
  ✓ top ranking is ordered by real enquiry demand
  ✓ browsing a listing populates the history rail on the home page
  ✓ Ask AI parses a requirement and shows its working
  ✓ the manufacturers tab lists suppliers with their product strips
  ✓ the four scope tabs navigate and carry the query
  ✓ the Regions tab actually searches
  ✓ the hero's category scope narrows the results
  ✓ the mega menu stays open when a mouse user clicks the trigger
  ✓ the home page leads with the product grid, no dead columns

admin.spec.ts
  ✓ the overview counts what is actually in the data
  ✓ the verification queue leads with the worst SLA breach
  ✓ approving a supplier publishes the drafts it was holding
  ✓ rejection names only the documents that are wrong
  ✓ a site visit clears listing but holds transacting
  ✓ suspending a supplier pulls its listings out of the marketplace
  ✓ the activity feed reflects a decision that was actually taken
  ✓ every exception on the overview links to something real
  ✓ the console sections all render their real data
  ✓ the manufacturer record moves between its tabs with the keyboard
  ✓ the decision panel is operable with the keyboard alone
  ✓ the four internal roles each own a section
  ✓ text clears AA with margin in light mode
  ✓ text clears AA with margin in dark mode

35 passed
```

The happy-path onboarding spec drives all nine steps, uploads six documents through the real
file chooser, then **closes the loop the way production will**: it follows the applicant's
own link into `/admin/verification/[id]`, records an approval there, returns to the
applicant's tracker and asserts it reads Verified — with nothing wiring the two screens
together beyond the shared repository. It then selects a package, creates a listing with
quantity price bands, asserts the preview shows `KSh 735`, and lands on the dashboard.

The admin specs each take a real decision and check the consequence somewhere else in the
product. Approving Kakamega Hardware is asserted three times over: the reviewer reads
Verified, the supplier's storefront comes up with stock, and their previously drafted Wire
Nails listing appears in the central catalogue — all three reading the same
`publicListings()` rule.

### Build and static analysis

- `npx tsc --noEmit` — clean
- `npx eslint .` — 0 errors, 6 warnings (all `react-hooks/incompatible-library`: the React
  Compiler declines to optimise components using React Hook Form. Upstream, not a defect)
- `npx next build` — clean, 43 routes (41 static, 2 dynamic on `[id]`)

### Responsive

Horizontal page scroll measured on the **production build** by attempting
`window.scrollTo(99999, 0)` and reading `window.scrollX`:

| Width | Result |
| --- | --- |
| 375px | All pages OK |
| 768px | All pages OK |
| 1440px | All pages OK |
| 1900px | All pages OK |

The Phase 3 routes were measured again separately — 13 admin and verification paths × 4
widths × light and dark, 104 measurements, reading `documentElement.scrollWidth -
clientWidth` after data had landed so tables were at their real width. No overflow
anywhere. Every wide table sits inside its own `.scroll-x` container.

Wide tables confirmed to still scroll inside their own container (326px box, 672px
content, 346px of internal scroll) — the fix clips paint, not content.

### Accessibility

Tab order on the account step, verified programmatically:

```text
 1. a       Skip to form
 2. a       Buildex Connect
 3–5. button Light / Dark / System
 6. a       Save & exit
 7–11. input (5 form fields)
12–13. button (2 consent checkboxes)
14. a      Go to your dashboard
15. button Create account
```

- Submitting an empty form exposes **6** validation messages with `role="alert"` and marks
  **4** inputs `aria-invalid`
- All upload dropzones are keyboard-focusable (they are real `<button>` elements wrapping a
  hidden file input, not drag-only divs)
- Light and dark verified by screenshot at 375px and 1440px
- Text and border contrast measured on every run in both themes — see
  [03 — Architecture](./03-architecture.md#text-and-border-contrast-measured). The check
  was verified to fail on the previous token values before being relied on

### Backend readiness

```text
grep -rn "fixtures"  app/ components/   →  no matches
grep -rn "data/mock" app/ components/   →  no matches
```

The seam is intact. No component bypasses the repository interfaces.

---

## Defects found and fixed

Building the test suite, reviewing screenshots and adopting the brand surfaced nine real
defects. None were test artefacts.

### 1. Lost-update race on document upload

Uploading the six required documents in quick succession kept only the last. Each save
computed its patch from a render-time snapshot of the draft, so later writes silently
dropped earlier ones.

Fixed at the seam: `OnboardingRepo.save` now accepts a functional patch
(`(current) => patch`) resolved against the freshest state, so concurrent saves compose.
Worth keeping through the cutover — the same hazard exists against a real API.

`lib/data/types.ts`, `lib/data/mock/repos.ts`, `app/connect/onboarding/documents/page.tsx`

### 2. Step-reachability deadlock

`furthestReachableStep()` returned `verification` while no subscription existed, so
reaching the subscription step required already having a subscription. The funnel could
never be completed.

`lib/rules/onboarding.ts`

### 3. Page scrolled sideways at 375px

On the two pages carrying the package comparison table. The scroll container clipped its
layout correctly (326px box, 672px content, internally scrollable) and no element laid out
past the viewport — but the table's **ink** overflow still counted toward the root's
scrollable area.

Confirmed on the production build, so not a dev-overlay artefact. Neither
`overflow: hidden` on the card nor `overflow-x: clip` on the body fixed it; `contain: paint`
on the scroll container did. That is also semantically correct: an overflow scroller is
precisely a promise that nothing paints outside it.

`app/globals.css`

### 4. Clipped prices in package cards

Annual prices overflowed their card at four columns, rendering "KSh 180,000 /ye". The
cards sit between a 16rem nav and a 20rem summary rail, so four columns only fit on very
wide screens. Now two-up until `2xl`, with the amount at `text-lg` and a non-wrapping
period suffix.

`components/shared/package-picker.tsx`

### 5. Truncated navigation labels

"Orders & enquiri…", "Regional campai…" — the "Soon" badge takes the tail of each row in a
16rem sidebar. Labels shortened to fit.

`app/connect/(portal)/layout.tsx`

### 6. Focus stolen mid-typing in the directors step

`useFieldArray.update()` remounts the row and regenerates its React key, so running the
IPRS check while a director's details were being entered moved the caret. Replaced with
`setValue`, which updates in place.

`app/connect/onboarding/directors/page.tsx`

### 7. Headings silently fell back to Arial

Found while adopting the brand typography. `--font-display` is declared on `:root` and
references `--font-montserrat`, but `next/font` put that variable on `<body>`. A `var()`
inside a custom property resolves at the scope where the property is *declared*, so the
reference resolved to nothing, the `font-family` declaration became invalid, and every
heading inherited Arial — with no error in the console, the build or the linter. Moving the
font class to `<html>` fixed it.

`app/layout.tsx`

### 8. Brand mark clipped at small sizes

The house outline's stroke extended past the SVG viewBox at the roof apex and chimney, so
the top of the logo was cut off in the sidebar and header. Geometry re-inset by half the
stroke width, and the standalone mark redrawn at house proportions (~1.4:1) rather than the
master artwork's full-lockup width.

`components/shared/brand.tsx`

### 9. Header overflowed at 375px after rebranding

The wordmark grew wider once it carried a descriptor chip, pushing the public header past
the viewport. The header is now responsive: smaller wordmark, "Sign in" hidden below `sm`,
and a shortened CTA label. Caught by the overflow check, which is exactly why it runs on
every page at three widths.

`app/(public)/layout.tsx`

### 10. A check movement silently un-suspended a suspended supplier

`deriveStatus()` reads only the checks, by design — it is what keeps ops, the wizard and the
manufacturer's tracker in agreement. But suspension is not derived from checks: it is an
administrative hold. So any later check movement on a suspended manufacturer recomputed
status from the pipeline and quietly put them back in business, with no error anywhere and
nothing on screen to notice.

Found while building the console, because the console is the first surface that can suspend
and then keep reviewing the same record. `isAdministrativeHold()` now outranks the derived
value, and `verifiedAt` is still driven by the derived state so it cannot claim a
verification that has been withdrawn.

`lib/rules/ops.ts`, `lib/data/mock/repos.ts`

### 11. Three screens promised drafts publish themselves; nothing did it

The onboarding first-listing step, the manufacturer's verification tracker and the admin
listings queue all state that a draft goes live the moment its supplier clears — "you do not
need to come back and publish it". Nothing implemented it. A listing created before
verification stayed a draft forever, so the first thing a newly approved manufacturer would
have found is an empty storefront and a promise the product had broken.

`draftsToPublishOnClearing()` now makes it true, applied in `replaceManufacturer()` — the one
write path that changes a manufacturer's status — so it happens however the status moved: an
ops decision, a reinstatement, or the manufacturer's own resubmission clearing the last
check. It fires only on the transition *into* a listable state from one where publishing was
impossible, which is what stops it from publishing drafts a supplier deliberately parked, and
why reinstating a suspended supplier pushes nothing live.

Now asserted end to end: approving Kakamega Hardware puts their Wire Nails listing in the
public catalogue.

`lib/rules/ops.ts`, `lib/data/mock/repos.ts`

### 12. The audit trail could not show what Buildex had done

Every verification check was attributed to `system`. Two of the five are Buildex's own
work — document completeness sits with Operations, the site visit with the field team — and
the other three are external registry lookups. With all five marked `system`, filtering the
timeline to Buildex Operations returned almost nothing, which made the Team page's audit
panel structurally unable to answer the only question it exists for.

A check's actor now follows its declared authority.

`lib/data/mock/activity.ts`

### 13. React Compiler: memoization could not be preserved

The enquiries console derived its per-supplier answer rates in a `useMemo` keyed on
`rows ?? []` — a fresh array every render, so the memo never held and the compiler refused
to compile the component at all (an error, not a warning). Rewritten as a plain top-level
function over `rows`: the compiler memoizes it correctly, and the dependency that actually
matters is the one the query already tracks.

`app/(admin)/admin/enquiries/page.tsx`

### 14. Secondary text and borders were too faint to read

Reported from a screenshot: "the site look faint, words no clear to the eye." Measuring it
found secondary text at 5.63:1 and 4.54:1 on white — both passing AA, the second by 0.04 —
carrying most of the prose on every page, including 12px uppercase KPI labels. Card borders
were 1.27:1, so surfaces meant to be separated by a 1px border had no visible edge and the
whole interface read as one flat wash.

Passing a standard is not the same as being legible. The three text levels are now 14.09,
8.04 and 6.29 on white with matching lifts in dark mode, borders are 1.58:1, and the KPI
label takes the stronger of the two secondary tones at semibold rather than the faintest.
A spec measures all of it on every run.

`app/globals.css`, `components/shared/stat-card.tsx`

### 15. Fourteen site visits that never happened

`buildChecks` stamped `startedAt` on any check that was not `pending` — including
`not_required`. Fourteen suppliers therefore carried a start time on a site visit nobody
would ever make, and the activity feed dutifully announced "Physical site visit opened
for…" for each one. Fabricated entries in an audit trail are worse than missing ones.

Found by reading the console's own recent-activity panel and not believing it.

`lib/data/fixtures/manufacturers.ts`

### 16. Fresh applications were permanently "opened this minute"

The same builder offset check timestamps a fixed half-day back from submission, clamped at
zero. Anything submitted inside the last twelve hours therefore resolved to *now* — so the
two newest applications showed their checks opening "this minute", and kept showing it,
because the clamp re-resolved to whenever the page happened to load. Timestamps are now a
proportion of the application's age, which scales correctly at any age.

`lib/data/fixtures/manufacturers.ts`

### 17. Every enquiry was answered in exactly twelve hours

The fixture stamped `respondedAt` at a flat twelve hours after arrival, for all 34 answered
enquiries. Savannah Cement's storefront advertises a three-hour reply and had, by its own
records, never once met it — and the console's "past their own promise" column counted zero,
because it measured only enquiries still waiting. A late reply is still a reply.

Response times are now derived from each supplier's advertised hours, with a deliberate
minority genuinely late; `enquiryRows()` returns the response time alongside the wait; and
the console counts both. Ten of 34 replies are now visibly late, against the promise each
supplier makes on its own storefront.

`lib/data/fixtures/enquiries.ts`, `lib/data/mock/admin.ts`, `app/(admin)/admin/enquiries/page.tsx`

### 18. Facet counts described a different dataset

The activity filter's per-kind counts came from every event on record while the list they
sat beside was scoped to a period — so a chip could read 112 inside a 30-day window holding
three. `kinds()` now takes the same filter as `list()`, minus the kind selection itself, so
the number describes what clicking it returns.

`lib/data/types.ts`, `lib/data/mock/activity.ts`, `app/(admin)/admin/activity/page.tsx`

### 19. Money tiles read "KSh 0" while loading

Three overview tiles fell back to `?? 0`, so a page still fetching stated that nothing was
in flight, nothing had been accepted and nothing had been spent. The same defect as category
counts showing 0 during load, fixed once already: an unknown number has to look unknown.

`app/(admin)/admin/page.tsx`

### 20. Two roles claimed the same powers

The team page exists to say who owns what, and shipped with "set a package" and "pause a
campaign" listed under both Operations and Commercial & Accounts. Both are commercial
decisions and now sit with Commercial alone; a spec asserts no duty text appears twice.

`app/(admin)/admin/team/page.tsx`

### Also: the Next.js dev indicator sat on the user block

Next 16's dev overlay defaults to bottom-left, which is exactly where `AppShell` puts the
signed-in user's name and role — so in development it covered them on every portal and
console page. Moved to the corner that only carries demo chrome, with the Demo controls
button lifted above it.

`next.config.ts`, `components/shared/demo-panel.tsx`

### Also addressed: React Compiler correctness

Next.js 16 ships React Compiler lint rules, which flagged genuine hazards rather than
style issues. All were fixed properly rather than suppressed:

| Rule | Fix |
| --- | --- |
| `Cannot call impure function during render` | `Date.now()` / `new Date()` moved out of component bodies into `lib/rules/documents.ts` and `isDocumentExpired()` — which also removed the same logic duplicated across three upload surfaces |
| `Calling setState synchronously within an effect` | `useQuery` now derives `loading`; the theme toggle uses `useSyncExternalStore`; subscription selection is derived during render; the mobile drawer uses React's documented adjust-state-during-render pattern, which also fixed the drawer staying open on browser back/forward |

---

## Known limitations

These are intentional for a mockup, listed so nobody mistakes them for oversights.

| Limitation | Note |
| --- | --- |
| No authentication | The portal resolves to the manufacturer created by this browser's onboarding, or a seeded fallback. A banner says so |
| Uploaded files are discarded | Only name, size and type are recorded. Enough to drive completeness, review and expiry without holding megabytes of scanned certificates in `localStorage` |
| Data is per-browser | Clearing site data resets everything |
| Package prices are placeholders | Labelled "indicative" in the UI, pending commercial approval |
| Verification decisions are unauthenticated | Ops decides in `/admin`, but anyone can open it. Real roles and four-eyes on rejection arrive with authentication at the cutover |
| Registry lookups are simulated | BRS, KRA and IPRS results come from the fixtures. Real adapters are Phase 9 |
| OTP accepts any six digits | The code is displayed on screen in demo mode |
| React Compiler skips form components | React Hook Form is not yet compiler-compatible; 6 warnings, no functional impact |
| No hardware-shop directory in the console | Hardware shops are Phase 4, so there is nothing to administer yet |
