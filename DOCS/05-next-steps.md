# 05 — Next Steps

## Recommended next slice: C2 — membership and the access gate

Phase 3 closed the Connect loop on the *selling* side: a manufacturer signs up, Buildex
Operations verifies them in `/admin`, the listings they were holding go live, and a buyer
can find them.

**C1 closed the identity gap on the buying side.** There is now a `Customer` — one typed
record covering a homeowner, a fundi, a contractor, a hardware shop, a developer and an
institution — with registration at `/join`, four derived verification levels, and an
account area at `/account`. The marketplace front door carries Chapter 9's promise and the
three-step entry journey, and the header knows who is signed in.

What is still missing is everything that identity was *for*. The membership tiers and the
§9.12 access matrix are declared in `lib/schemas/membership.ts` because registration needs
a real comparison to show — but nothing reads them as an entitlement yet. That is C2.

### C2 — membership and the access gate

| Piece | Scope |
| --- | --- |
| `lib/rules/access.ts` | `can(customer, capability)` → allowed, or what is needed: membership, tokens, verification, trust. §9.33's decision logic in one pure function |
| `components/shared/access-gate.tsx` | One component for every withheld value: what is behind it, why, and the one action that opens it |
| `/account/membership` | Current tier, entitlements, upgrade — reusing `PlanCards` / `PlanComparison` |
| A public pricing page | The same `ACCESS_MATRIX`, so it cannot promise what the gate will not grant |
| `lib/rules/pricing.ts` | Member price over the band price (§9.27), on product, search and compare — marked indicative |
| Member deals | Already seeded; C2 makes the tier actually gate them |

**The one change that can make the product worse.** §9.40: *"Do not charge simply for basic
discovery."* Everything public today — search, categories, price bands, MOQ, lead times,
verification status — stays public. The gate applies only to *new* premium surfaces:
detailed supplier and product intelligence, supplier contact, advanced comparison, market
price intelligence, premium quotation. Gating what is free today would be a regression
dressed up as a feature.

**Rough order:** `can()` → the gate component → `/account/membership` → the public pricing
page → member pricing → gating the new premium surfaces.

### Then

| Phase | Scope | Depends on |
| --- | --- | --- |
| C3 | Wallet, the KES 25 token engine, statements | C2 (the gate is what a token opens) |
| C4 | Buyer quote inbox, cart, checkout, per-supplier orders, delivery, authorized users | C3 (checkout draws on the wallet) |
| C5 | Trust Score, Prestige Profile, Buildex Supplier Score | C4 for the commercial dimensions — though seeded customers already carry delivery history, so it is not empty before then |
| C6 | Personalisation, alternatives, procurement analytics, Business Passport, the §9.35 KPIs | C4, C5 |
| C7 | FundiSmart — professionals directory and service enquiries | Independent; the search scope and IA are already in place |
| 5–6 | Buildex Capital — wallet-backed credit, scoring, collections | **Blocked on the regulatory review below**, not on software |
| 8 | Consumer segments, campaign builder, attribution | C4 transaction data |
| 9 | Backend cutover | Can start per-entity as soon as a schema is agreed |

**The old Phase 4 (`/shop/*` hardware portal) is gone.** Its scope lives in C4 against the
one `Customer` record — see [01 — Implementation Plan](./01-implementation-plan.md).

### Also outstanding from earlier phases

| Item | Note |
| --- | --- |
| Four-eyes on rejection | A rejection costs a supplier days. The decision path already records what happened; what it needs is a second reviewer, which needs authentication first |
| Customer-facing exceptions in the console | Customers who stop ordering, disputes ageing, tokens bought but never spent. Nothing to show until C3 and C4 |
| A customer directory in `/admin` | The console has a manufacturer register and a vendor ledger; it has no view of the customer base. Worth pulling forward alongside C2, since membership run-rate is a commercial question |

---

## Then

| Phase | Scope | Depends on |
| --- | --- | --- |
| 4 | Hardware shop accounts, cart, ordering, fulfilment, inventory | Phase 2 marketplace (done — there is now something to buy) |
| 5 | Wallet, credit eligibility, application, loan tracker, repayment | Phase 4 (transaction history to score on) |
| 6 | Credit scoring engine, underwriting queue, portfolio, collections | Phase 5 |
| 7 | Remaining marketing pages (Buildex, Capital, hardware acquisition) | Independent — can be pulled forward any time |
| 8 | Consumer segments, campaign builder, attribution | Phase 4 POS data |
| 9 | Backend cutover | Can start per-entity as soon as a schema is agreed |

Phase 7 is the one piece with no dependencies. If an external-facing demo is needed sooner
than the portals, pull it forward.

---

## Blockers

These are not engineering blockers — they are decisions and engagements the requirements
document already flags, and Phases 5–6 should not go live without them.

### Regulatory and legal

The requirements are explicit that regulatory exposure is a design constraint, not
something to be structured around:

> All lending, payment, data-sharing, automated collection, pricing and recovery mechanisms
> should be validated against applicable Kenyan law and regulatory requirements before
> production launch.

Three mechanisms in particular are described in the requirements as hypotheses awaiting
review, and the mockup will build them as specified so they can be evaluated — but they
must not ship until that review closes:

| Mechanism | Status per requirements |
| --- | --- |
| Tenor-based product pricing (a product costing more on 7-day credit than on 5-day) | "Must be reviewed by legal/compliance professionals before launch" |
| Automatic wallet sweeping on the due date | "Evaluate automatic collection/sweeping mechanisms" |
| The 37-day recovery cycle | "Should be treated as a policy hypothesis to be validated" |

**Recommendation:** build Phase 5–6 screens behind a feature flag, and treat the credit
pilot as gated on the written regulatory assessment rather than on the software being
ready.

### Appointments outstanding

| Action | Owner per requirements | Needed before |
| --- | --- | --- |
| Appoint credit-policy / risk professional | Management | Phase 6 scoring model |
| Engage Kenyan legal / compliance counsel | Management / Legal | Phase 5 wallet and collections |

### Data outstanding

Phase 6's scoring engine needs real data to be more than a UI. The requirements list what
is needed immediately: hardware stock flow and movement records, historical sales and
turnover, M-Pesa/payment transaction records, customer transaction patterns, existing
credit and repayment information, and historical arrears and write-offs.

Until that arrives, Phase 6 can only be built against synthetic data — which is fine for
settling the UX, but the scoring variables cannot be validated. The requirements are clear
on this: use the first pilot to check whether the proposed variables actually predict
repayment before increasing limits.

---

## Decisions the demo can now support

The requirements list nine decisions awaiting management. Phases 1–3 make four of them
concrete enough to settle:

| Decision | What to look at |
| --- | --- |
| Manufacturer onboarding requirements | Walk Journey A. The seven-document KYB pack, five-check pipeline and site-visit trigger rule are all visible and adjustable |
| Manufacturer packages and pricing | `/connect/subscription` — the feature matrix is the commercial proposal in concrete form. Prices are placeholders |
| First release scope for the Manufacturer Portal | Phases 1–3, all shipped — walk the portal and the console back to back |
| Regional visibility pricing | `/connect/campaigns` to buy it, `/admin/campaigns` to see what 12 campaigns actually returned. CPM and reach are modelled placeholders, labelled as such |
| Verification SLAs and who owns each check | `/admin/verification` shows the four-hour document check and the 24/48/120-hour registry and site-visit targets against real ageing. Eight applications are in flight, eleven checks already past target |

The remaining five (six-month qualification, the 80% turnover threshold, pilot entry limit,
5/10/14-day cycles, wallet architecture) depend on Phases 5–6 and the regulatory review.

---

## Engineering housekeeping

Small items worth picking up alongside feature work.

| Item | Why |
| --- | --- |
| Move the onboarding draft server-side at cutover | "Save & exit" should survive a device change. `OnboardingRepo` already has the right shape |
| Fold the overflow sweep into CI | Phase 3 ran it as a one-off script across 13 routes × 4 widths × both themes. It belongs in the suite, not in a scratch file |
| Add one Playwright spec per journey as each phase lands | Journey A has four specs; keep that ratio |
| Keep the contrast spec in CI | It measures text and border ratios in both themes, and was verified to fail on the previous token values. Cheap insurance against a token tune that quietly makes the product faint again |
| Revisit React Hook Form compiler compatibility | 6 lint warnings today. Harmless, but worth re-checking when RHF ships compiler support |
| Bump `buildex.mock.v9` when fixture shape changes | Otherwise stale persisted data wins over new seeds. v9 added customers, offers, the registration draft and the search history |
| Keep the seam greps in CI | `grep -rn "fixtures" app/ components/` returning anything means the cutover is no longer a one-file change |
