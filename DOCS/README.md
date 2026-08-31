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
| [01 — Implementation Plan](./01-implementation-plan.md) | Phases 0–9 and the Chapter 9 phases C1–C7, scope of each, decisions taken, requirements traceability |
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
| 4 | Buildex Interiors — hardware shop supply | Superseded by C4 |
| 5 | Buildex Capital — hardware-facing credit | Not started |
| 6 | Buildex Capital — internal credit & risk console | Not started |
| 7 | Public marketing site (entry pages already exist) | Partial |
| 8 | Consumer intelligence | Not started |
| 9 | Backend integration cutover | Not started |

### Chapter 9 — the Trust Engine and the customer front end

`requirements_reference/BUILDEX CONNECT FRONT END CHAPTER 9.docx` specifies the *buying*
side of Buildex Connect, which Phases 0–3 left almost entirely unbuilt: the marketplace
could be browsed and enquired against, but the buyer was anonymous — no account, no
membership, no wallet, no order, no trust profile.

| Phase | Scope | Status |
| --- | --- | --- |
| C1 | Customer identity — the `Customer` record, registration, verification levels, the account area, the Chapter 9 front door | **Done** |
| C2 | Membership and the access gate — Build Free/Member/Pro/Business, the §9.12 access matrix, `can()` | Not started |
| C3 | Wallet and the KES 25 membership-token engine | Not started |
| C4 | Commerce — buyer quote inbox, cart, checkout, per-supplier orders, delivery, authorized users | Not started |
| C5 | Trust — the composed Trust Score, Prestige Profile, Buildex Supplier Score | Not started |
| C6 | Intelligence — personalisation, alternatives, procurement analytics, Business Passport, the §9.35 KPIs | Not started |
| C7 | FundiSmart — the services directory and service enquiries | Not started |

**C4 supersedes the old Phase 4 plan.** There is no separate `/shop/*` hardware portal: a
hardware shop is a `Customer` whose `customerType` says so, trading on the Build Business
tier. One registration, one wallet, one dashboard, entitlements varying by membership and
verification level rather than by which portal you signed into.

**This build is a mockup.** There is no database, no authentication, no M-Pesa and no
Odoo. All data is held in the browser behind repository interfaces designed to be
swapped for a real backend — see [03 — Architecture](./03-architecture.md). A "signed-in
customer" is a demo session in `localStorage`, and every account screen says so.

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

A **Demo controls** button floats bottom-right on every screen. It opens one
panel holding everything a presenter needs: the section you are currently on —
what it does, whose screen it is, and two or three things worth actually
clicking while you are there — then the other four sections, direct links to
the screens that are not sections of their own, and the reset control.

This used to be two pills in the same corner. "Walk the build" explained the
sections; "Demo controls" jumped between them and reset the data. They were the
same idea split in half, so a presenter had to remember which button held which.
They are one panel now.

It floats rather than sitting in the pages on purpose. Guidance baked into a
screen becomes something a reviewer has to mentally subtract before judging the
design, and something a developer has to remember to delete before launch. The
panel is brand blue rather than green, because green is the interface's success
colour and standing green scaffolding reads as "everything is fine" rather than
"here is what this is".

One definition drives it — `DEMO_SECTIONS` in
`components/shared/demo-panel.tsx`. Adding a section is one array entry, and
`NEXT_PUBLIC_DEMO_MODE=false` removes the whole thing.

**As a customer (Chapter 9):**

1. `/marketplace` — the front door carries the customer promise, the six verbs, and the
   three-step entry journey (which stands down once you are signed in).
2. `/join` — four steps: account, phone OTP, where you buy and what kind of buyer you
   are, membership. Pick "Hardware shop" or "Contractor" on the third step and the
   business fields appear; pick "Homeowner" and they never do.
3. `/account` — membership, the verification level you have *earned* rather than bought,
   what would move it, offers at your tier, suppliers who actually reach your region, and
   your recent searches. The four things Chapter 9 puts here that later phases build are
   named rather than mocked up with invented figures.
4. The account control in the marketplace header names the account. Sign out by clearing
   `session.customerId` and it offers registration instead.

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
