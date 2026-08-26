# Buildex Ecosystem — Documentation

Working documentation for the Buildex platform mockup: **Buildex** (product supply),
**Buildex Capital** (financing) and **Buildex Connect** (manufacturer marketplace).

| Document | What it covers |
| --- | --- |
| [01 — Implementation Plan](./01-implementation-plan.md) | Phases 0–9, scope of each, decisions taken, requirements traceability |
| [02 — User Journeys](./02-user-journeys.md) | Step-by-step journeys A–G across all three businesses |
| [03 — Architecture](./03-architecture.md) | Stack, the data seam, design system, conventions, backend cutover guide |
| [04 — Delivered](./04-delivered.md) | What Phases 0–1 actually shipped, verification evidence, defects found and fixed |
| [05 — Next Steps](./05-next-steps.md) | Immediate actions, Phase 2 scope, open decisions and blockers |

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
| 2 | Buildex Connect — manufacturer portal | Not started |
| 3 | Buildex Console — ops & verification queue | Not started |
| 4 | Buildex — hardware shop portal & supply | Not started |
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

Screen-specific scenario controls live on the screen they affect — advancing a
verification check is on the verification page, uploading an expired certificate is on
the documents step. Set `NEXT_PUBLIC_DEMO_MODE=false` to hide the global panel.

### Walking the demo

1. `/` — ecosystem overview
2. `/manufacturers` — the acquisition page a manufacturer lands on
3. `/connect/onboarding/account` — start the nine-step onboarding journey
4. On the verification step, use **Demo scenarios** to approve, reject or conditionally
   approve the application
5. `/connect/dashboard` — the manufacturer portal after onboarding

To see the duplicate-registration path, enter KRA PIN `P051234567M` at the company
step — it already belongs to a seeded manufacturer.
