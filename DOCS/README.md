# Buildex Ecosystem — Documentation

Working documentation for the **Buildex Connect** platform mockup.

Buildex Connect is the platform. Inside it sit three businesses:

| Business | Role |
| --- | --- |
| **Buildex Interiors** | Product supply and distribution (the parent company, *Buildex Interiors Co. Ltd.*) |
| **Buildex Capital** | Credit, financing and collections |
| **Buildex Connect** | The manufacturer marketplace |

"Buildex Connect" therefore names both the platform and the marketplace inside it, the way
a company and its flagship product often share a name. Where the distinction matters, the
copy says "the Buildex Connect marketplace".

| Document | What it covers |
| --- | --- |
| [01 — Implementation Plan](./01-implementation-plan.md) | Phases 0–9, scope of each, decisions taken, requirements traceability |
| [02 — User Journeys](./02-user-journeys.md) | Step-by-step journeys A–G across all three businesses |
| [03 — Architecture](./03-architecture.md) | Stack, the data seam, design system, conventions, backend cutover guide |
| [04 — Delivered](./04-delivered.md) | What Phases 0–3 actually shipped, verification evidence, defects found and fixed |
| [05 — Next Steps](./05-next-steps.md) | Immediate actions, Phase 2 scope, open decisions and blockers |
| [06 — Deployment](./06-deployment.md) | The server, the CI/CD pipeline, rollback, TLS and the access model |

Source requirements live in [`requirements_reference/`](../requirements_reference/):

- `Buildex_Ecosystem_Project_Next_Steps.docx` — the consolidated roadmap and action register
- `Buildex Ecosystem Strategy and Financial Integration_ Briefing Document.docx` — strategy briefing
- `My final recommendation_language Stack.txt` — stack recommendation

---

## Status at a glance

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Foundation — design system, app shell, data seam, fixtures | **Done** |
| 1 | Buildex Connect — manufacturer onboarding | **Done** |
| 2 | Buildex Connect — marketplace & manufacturer portal | **Done** |
| 3 | Buildex Admin — ops, verification queue, platform activity | **Done** |
| 4 | Buildex Interiors — hardware shop portal & supply | Not started |
| 5 | Buildex Capital — hardware-facing credit | Not started |
| 6 | Buildex Capital — internal credit & risk console | Not started |
| 7 | Public marketing site (entry pages already exist) | Partial |
| 8 | Consumer intelligence | Not started |
| 9 | Backend integration cutover | Not started |

**This build is a mockup.** There is no database, no authentication, no M-Pesa and no
Odoo. All data is held in the browser behind repository interfaces designed to be
swapped for a real backend — see [03 — Architecture](./03-architecture.md).

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright end-to-end suite |

First run of the test suite needs browsers: `npx playwright install chromium`.

### Demo controls

A **Demo controls** button sits bottom-right on every page. It holds jump links to the
key screens and a **Reset all demo data** action that clears the in-progress
application and restores the seeded manufacturers and catalogue.

Screen-specific scenario controls live on the screen they affect — uploading an expired
certificate is on the documents step. Set `NEXT_PUBLIC_DEMO_MODE=false` to hide the global
panel.

**Verification is no longer one of them.** It now moves the way it will in production:
Buildex Operations decides in the console at `/admin/verification`. The manufacturer's own
verification screen carries a link straight to the reviewer, labelled as the prototype
shortcut it is.

### Walking the demo

**As a buyer (hardware shop):**

1. `/marketplace` — the storefront home. Hover **All categories** for the mega menu,
   or use the search hero (Ask AI / Products / Manufacturers / Regions). Scroll and the
   header collapses into a compact bar with inline search.
2. `/marketplace/ask` — describe a job in plain words, e.g. *"400 bags of cement delivered
   to Machakos"*. It shows what it recognised and prices your quantity.
3. `/marketplace/search` — faceted results. Filter by category and delivery region, sort
   by price or lead time. Deep-linkable: `?q=`, `?category=`, `?region=`.
4. Open any listing — the price-band table highlights the band your quantity falls into,
   and the calculator shows the line total.
5. **Visit store** — that manufacturer's own storefront, carrying only their range.
6. Send a quote request, or use `/marketplace/rfq` to reach every supplier who makes that
   category *and* delivers to your region at once.
7. `/marketplace/manufacturers`, `/marketplace/top-ranking` and `/marketplace/regions` — demand leaderboard and
   delivery coverage. Revisit `/marketplace` and your browsing history is there.

**As a manufacturer:**

1. `/connect/onboarding/account` — the nine-step onboarding journey. On the verification
   step, your application is with Buildex Operations; **Open the reviewer** jumps to the
   console so you can play both sides.
2. `/connect/catalogue` — add, edit and archive listings.
3. `/connect/orders` — the enquiry you sent above is in the inbox. Quote it.
4. `/connect/campaigns` and `/connect/insights` — regional targeting and performance.

**As Buildex (internal):**

1. `/admin` — the platform overview. Eight KPIs, then the exceptions panel: checks past
   SLA, applications waiting on the manufacturer, expired documents, and enquiries a
   supplier has left longer than their own advertised response time.
2. `/admin/verification` — the queue, ordered by SLA breach risk rather than arrival.
   Eight applications are in flight in the seed data.
3. Open one — the reviewer shows the declared company beside its directors and documents,
   states whether shareholding reconciles to 100%, and shows exactly which checks each
   decision will move *before* you click. Approve `Kakamega Hardware` and their draft
   listings appear in the marketplace immediately.
4. `/admin/manufacturers` — all 16 suppliers. Suspend one and their storefront goes dark
   and their listings leave the catalogue; reinstating recomputes from the checks, so a
   previously verified supplier comes back verified.
5. `/admin/enquiries` — who is answering and who is not, measured against each supplier's
   own advertised response time.
6. `/admin/activity` — the whole platform timeline, filterable by event type, actor,
   supplier, period and free text. Every row is derived from a real record.
7. `/admin/team` — the four internal roles, the section each one owns, and what is
   deliberately not theirs to do. The console has no authentication and says so on every
   page.

To see the duplicate-registration path, enter KRA PIN `P051234567M` at the company
step — it already belongs to a seeded manufacturer. To see visibility gating, try
`/marketplace/manufacturer/mfr_kakamega_hardware` — still in verification, so no public
store. Then approve them at `/admin/verification/mfr_kakamega_hardware` and reload that
storefront.
