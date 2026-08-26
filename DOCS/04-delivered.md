# 04 — Delivered

Covers Phase 0 (Foundation) and Phase 1 (Buildex Connect manufacturer onboarding).

## Summary

| Metric | Value |
| --- | --- |
| Source files | 63 (`app/`, `components/`, `lib/`, `e2e/`) |
| Routes | 20 (plus `/_not-found`) |
| Onboarding steps | 9, all resumable and deep-linkable |
| Seeded manufacturers / products | 12 / 24 |
| End-to-end specs | 4, all passing |
| TypeScript | `tsc --noEmit` clean |
| ESLint | 0 errors |
| Production build | Clean, all routes prerendered as static |

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
| `product-preview-card.tsx` | The card a hardware shop sees — shared by preview and marketplace |
| `page-header.tsx` | `PageHeader` with breadcrumbs, and `PhasePlaceholder` |
| `format.tsx` | `Currency`, `Num`, `Pct`, `DetailRow` |
| `stat-card.tsx` | A single figure with label and hint |
| `demo-panel.tsx` | Global demo controls |

### Data layer

Zod schemas (`lib/schemas/`) covering common primitives and reference data, documents,
verification, subscription, product and the manufacturer aggregate — roughly 1,000 lines
that are the intended database contract.

Repository interfaces, the swap point, the in-memory store with `localStorage` persistence
and cross-tab sync, and Kenyan seed data.

### Roadmap placeholders

Rather than dead links, the five later-phase routes (`catalogue`, `orders`, `campaigns`,
`insights`, `settings`) render a `PhasePlaceholder` naming the phase and listing what it
will add. A stakeholder walking the demo sees the roadmap instead of a 404, and the
navigation reflects the finished information architecture from day one.

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

**The preview is the real component.** `ProductPreviewCard` is what the marketplace will
render in Phase 4. A preview that drifts from the real thing is worse than no preview.

---

## Verification

### End-to-end (`npm run test:e2e`)

```text
✓ a manufacturer can complete onboarding end to end          (8.8s)
✓ a duplicate KRA PIN blocks the company step                (2.9s)
✓ an expired document keeps the pack incomplete              (3.5s)
✓ a draft resumes at the right step and clamps deep links    (3.4s)

4 passed
```

The happy-path spec drives all nine steps, uploads six documents through the real file
chooser, approves the application through the demo controls, selects a package, creates a
listing with quantity price bands, asserts the preview shows `KSh 735`, and lands on the
dashboard with the activation checklist rendered.

### Build and static analysis

- `npx tsc --noEmit` — clean
- `npx eslint .` — 0 errors, 4 warnings (all `react-hooks/incompatible-library`: the React
  Compiler declines to optimise components using React Hook Form. Upstream, not a defect)
- `npx next build` — clean, 21 routes prerendered

### Responsive

Horizontal page scroll measured on the **production build** by attempting
`window.scrollTo(99999, 0)` and reading `window.scrollX`:

| Width | Result |
| --- | --- |
| 375px | All 7 pages OK |
| 768px | All 7 pages OK |
| 1440px | All 7 pages OK |

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
| Verification is simulated | Advanced through demo controls. Real BRS / KRA / IPRS adapters are Phase 9 |
| OTP accepts any six digits | The code is displayed on screen in demo mode |
| React Compiler skips form components | React Hook Form is not yet compiler-compatible; 4 warnings, no functional impact |
