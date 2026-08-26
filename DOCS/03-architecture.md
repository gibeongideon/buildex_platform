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

Chosen to match the production stack in the stack recommendation
(`Next.js + TypeScript + PostgreSQL + Drizzle + Odoo API + M-Pesa`) so that mockup
components survive the backend cutover rather than being thrown away.

---

## Directory layout

```text
app/
  (public)/               Public front door — /, /manufacturers
  connect/
    onboarding/           The nine-step wizard, with its own focused layout
    (portal)/             Manufacturer portal — dashboard, verification, subscription, …
  globals.css             Design tokens. The only file that hard-codes a colour.
  layout.tsx              Root layout, font, theme script, demo panel

components/
  ui/                     Primitives — button, form fields, cards, pills, chips
  shared/                 Composed, product-aware components

lib/
  schemas/                Zod schemas — the contract for the future database
  data/
    types.ts              Repository interfaces (THE SEAM)
    index.ts              Active implementation (THE SWAP POINT)
    mock/                 In-memory store + repository implementations
    fixtures/             Kenyan seed data
    hooks.ts              React bindings — useQuery
  rules/                  Business rules, kept out of both schemas and components
  utils.ts                Formatting (KSh, dates, percentages) and small helpers

e2e/                      Playwright specs
DOCS/                     This documentation
requirements_reference/   Source requirement documents
```

Route groups (`(public)`, `(portal)`) do not appear in URLs. They exist so each product
area can own its own layout while sharing one component library. Splitting any group into
its own deployable app later is a directory move.

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
3. Repository calls carry 140–420 ms of artificial latency. This is deliberate: it forces
   every screen to have a real loading state, so the swap to a networked backend does not
   surface a whole class of missing UI.
4. Business rules live in `lib/rules/`, not in components and not in schemas — so ops
   actions, demo controls and the wizard can never disagree about what the rules are.

### Interfaces

| Repository | Responsibility |
| --- | --- |
| `ManufacturerRepo` | List, fetch, create from draft, update, duplicate-PIN lookup, check transitions, document replacement, subscription |
| `ProductRepo` | Catalogue CRUD per manufacturer |
| `OnboardingRepo` | Load, save and clear the in-progress application draft |
| `SessionRepo` | Which demo role and manufacturer is "signed in" |

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

### Two colour scales, kept apart

This is a deliberate constraint, not a stylistic preference.

**Product identity** — used only in navigation chrome, product badges and chart series:

| Product | Light | Dark |
| --- | --- | --- |
| Buildex (supply) | `#123A5F` | `#6BA3D6` |
| Buildex Capital | `#12654A` | `#4FBF95` |
| Buildex Connect | `#9A5B18` | `#D9973F` |

**Semantic** — used only for status pills, alerts and validation:

| Meaning | Light | Dark |
| --- | --- | --- |
| success | `#15803D` | `#56C26C` |
| warning | `#A16207` | `#D6A13A` |
| danger | `#B91C1C` | `#F2726B` |
| info | `#1D4ED8` | `#6FA8F5` |

Keeping them in separate roles is what stops a Capital-green sidebar reading as
"everything is fine" on a page full of overdue loans.

### Foundation

- **Primary / all CTAs:** deep navy `#0B2545`, hover `#123A5F`. In dark mode the CTA
  colour *lifts* to `#2E6DB4` — deep navy is invisible on near-black.
- **Surfaces are separated by 1px borders, not shadows.** Shadows are reserved for true
  overlays.
- **Type:** Inter, scale 12 / 14 / 16 / 20 / 24 / 30 / 38.
- **Density:** 8pt grid, 40px controls, 44px dense table rows.

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

Data is persisted to `localStorage` under `buildex.mock.v2`. Bump that key when the shape
of seeded data changes, or old persisted data will win.
