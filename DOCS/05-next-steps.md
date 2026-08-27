# 05 — Next Steps

## Recommended next slice: Phase 4

Phase 3 closed the Connect loop: a manufacturer signs up, **Buildex Operations verifies
them in `/admin`**, the listings they were holding go live, and a buyer can find them. The
console also gave the platform its first internal view — one activity timeline, one
exceptions list, one place where suspension, listing moderation and package overrides
happen.

What is still missing is the *other* side of the counter. The marketplace can be browsed and
enquired against, but a hardware shop has no account, no cart and no order. Everything
downstream depends on that: Buildex Capital cannot score credit without transaction
history, and consumer intelligence has no POS data to read.

### Phase 4 — Buildex Interiors: hardware shop portal & supply

| Screen | Scope |
| --- | --- |
| `/shop/onboarding` | Hardware KYB plus owner ID verification — the same five-check pipeline shape, different document pack |
| `/shop/dashboard` | Orders in flight, spend to date, credit eligibility progress (read-only until Phase 5) |
| `/shop/cart` | Multi-supplier basket. Quantity bands already price per line; the open question is whether one order can span suppliers |
| `/shop/orders/[id]` | Order tracking, delivery notes, dispute path |
| `/shop/inventory` | Stock and movement records — the data Phase 6's scoring model needs |
| `/admin/shops` | The hardware directory in the console, alongside the manufacturer one |

Most of the seam is already shaped for it: `EnquiryRepo` proves the buyer→supplier round
trip, `publicListings()` already governs what a shop can see, and the console's table and
exception patterns transfer directly. What is genuinely new is an `OrderRepo` and a
`WalletRepo` stub — and the decision above about multi-supplier orders, which changes the
schema.

**Rough order:** `OrderRepo` interface → hardware onboarding → cart and checkout → order
tracking → the console's hardware directory → inventory.

### Also outstanding from earlier phases

| Item | Note |
| --- | --- |
| Bulk CSV price-list import (`/connect/catalogue/import`) | A preview table with a per-row error report. Self-contained addition to a page that already works |
| Four-eyes on rejection | A rejection costs a supplier days. The decision path already records what happened; what it needs is a second reviewer, which needs authentication first |
| Hardware-facing exceptions in the console | Shops that stop ordering, disputes ageing. Nothing to show until Phase 4 |

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
| Bump `buildex.mock.v6` when fixture shape changes | Otherwise stale persisted data wins over new seeds. v5 added four in-flight suppliers, v6 corrected the seeded check and response timestamps |
| Keep the seam greps in CI | `grep -rn "fixtures" app/ components/` returning anything means the cutover is no longer a one-file change |
