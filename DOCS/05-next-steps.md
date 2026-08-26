# 05 — Next Steps

## Recommended next slice: Phase 2 + 3 together

Phases 2 and 3 are worth doing as one push, because together they close the Buildex
Connect loop end to end — a manufacturer signs up, ops verifies them, they list a
catalogue, and a hardware shop can see it. Phase 2 alone leaves verification advancing only
through demo buttons.

### Phase 2 — Manufacturer portal

| Screen | Scope |
| --- | --- |
| `/connect/catalogue` | Create, edit, archive listings. Reuse `listingDraftSchema` and its price-band validation from the onboarding step |
| `/connect/catalogue/import` | CSV price-list import with a preview table and per-row error report |
| `/connect/orders` | Enquiry inbox: shop region, order size, requested delivery date; quote back or accept at list |
| `/connect/campaigns` | Regional targeting builder with live reach estimates and pricing derived from hardware coverage per region |
| `/connect/campaigns/[id]` | Impressions, product views, enquiries, orders, estimated conversion |
| `/connect/insights` | Category demand by region, price positioning, regions that view but do not enquire |
| `/connect/settings` | Company profile editing, team invitations with roles, settlement details, notification preferences |

**New repositories needed:** `CampaignRepo`, `EnquiryRepo`. Add the interfaces to
`lib/data/types.ts` first, then implement in `lib/data/mock/repos.ts`.

**Gating to respect:** `productLimit(package)` caps listings at 10 on Free and 50 on Basic;
`hasRegionalTargeting(package)` gates campaigns to Premium and VIP. Both already exist in
`lib/schemas/subscription.ts`.

### Phase 3 — Ops & verification console

| Screen | Scope |
| --- | --- |
| `/console/queue` | Verification queue sorted by SLA breach risk. `slaHoursRemaining()` already computes the ageing |
| `/console/queue/[id]` | Document reviewer — document alongside extracted fields |
| `/console/queue/[id]/decide` | Approve · reject with reasons · request more info · flag for site visit |
| `/console/manufacturers` | Directory with status, region and package filters |
| `/console/subscriptions` | Package administration and overrides |
| `/console/audit` | Immutable trail of who decided what and when |

Most of the machinery exists: `manufacturerRepo.setCheckStatus()` already handles
transitions, marks blocking documents and re-derives status. The console is largely a new
surface over existing operations, plus an `AuditRepo`.

This is also where the demo scenario buttons get retired — the console becomes the real way
to move an application.

**Rough order:** new repository interfaces → ops console shell and queue → decision actions
→ catalogue CRUD → campaigns → insights → retire demo scenario controls.

---

## Then

| Phase | Scope | Depends on |
| --- | --- | --- |
| 4 | Hardware shop portal, marketplace, ordering, inventory | Phase 2 catalogue (something to buy) |
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

The requirements list nine decisions awaiting management. Phase 1 makes three of them
concrete enough to settle, and Phases 2–3 will cover a fourth:

| Decision | What to look at |
| --- | --- |
| Manufacturer onboarding requirements | Walk Journey A. The seven-document KYB pack, five-check pipeline and site-visit trigger rule are all visible and adjustable |
| Manufacturer packages and pricing | `/connect/subscription` — the feature matrix is the commercial proposal in concrete form. Prices are placeholders |
| First release scope for the Manufacturer Portal | Phases 1–3 as scoped above |
| Regional visibility pricing | Phase 2 campaign builder |

The remaining five (six-month qualification, the 80% turnover threshold, pilot entry limit,
5/10/14-day cycles, wallet architecture) depend on Phases 5–6 and the regulatory review.

---

## Engineering housekeeping

Small items worth picking up alongside feature work.

| Item | Why |
| --- | --- |
| Move the onboarding draft server-side at cutover | "Save & exit" should survive a device change. `OnboardingRepo` already has the right shape |
| Add a `768px` screenshot to the review routine | Currently checked at 375 and 1440; the tablet breakpoint is where the portal grid switches |
| Add one Playwright spec per journey as each phase lands | Journey A has four specs; keep that ratio |
| Revisit React Hook Form compiler compatibility | 4 lint warnings today. Harmless, but worth re-checking when RHF ships compiler support |
| Bump `buildex.mock.v2` when fixture shape changes | Otherwise stale persisted data wins over new seeds |
| Keep the seam greps in CI | `grep -rn "fixtures" app/ components/` returning anything means the cutover is no longer a one-file change |
