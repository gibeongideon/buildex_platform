# 02 — User Journeys

Step-by-step journeys across all three businesses. Journey A is built; the rest are
specified here and land in the phase noted.

## Personas

| Persona | Belongs to | What they want |
| --- | --- | --- |
| **Manufacturer** | Buildex Connect | Reach hardware shops, know what the market is buying |
| **Hardware shop owner** | Buildex + Capital | Source stock, finance it, sell it |
| **Buildex Operations** | Internal | Verify manufacturers and shops, keep out fraud |
| **Credit / Risk Officer** | Buildex Capital | Underwrite, monitor the portfolio, recover |
| **Account Manager** | Buildex Connect | Actively sell VIP manufacturers' ranges |
| **End consumer** | Buildex (B2C) | Buy materials for the next stage of a build |

---

## Journey A — Manufacturer Onboarding ✅ Built (Phase 1)

**Persona:** operations manager at a paint / plywood / cement manufacturer wanting access
to Buildex's hardware network.

**Entry point:** `/manufacturers` → "Start selling on Buildex Connect"

| # | Screen | What happens |
| --- | --- | --- |
| 0 | `/manufacturers` | Value proposition, package teaser, what onboarding involves, CTA |
| 1 | `/connect/onboarding/account` | Name, work email, `+254` phone, password, marketplace terms + data-processing consent (Data Protection Act, 2019) |
| 2 | `/connect/onboarding/verify-phone` | 6-digit SMS OTP with a 30-second resend timer. Demo mode shows the code and accepts any six digits |
| 3 | `/connect/onboarding/company` | Legal name, trading name, BRS number, KRA PIN, year established, physical address, county, website, product categories, production capacity band, current distribution regions |
| 4 | `/connect/onboarding/directors` | Primary contact plus every director on the CR12 — National ID, role, ownership %, phone. Live IPRS check per director; shareholding must total 100% |
| 5 | `/connect/onboarding/documents` | Drag-and-drop KYB pack: BRS certificate, KRA PIN certificate, tax compliance certificate, CR12, director IDs, bank/M-Pesa settlement details, and optional KEBS Standardisation Mark |
| 6 | `/connect/onboarding/review` | Read-only summary of every section with edit jump-links, then submit |
| 7 | `/connect/onboarding/verification` | Live status tracker over five checks, each showing the responsible authority and its SLA |
| 8 | `/connect/onboarding/subscription` | Free / Basic / Premium / VIP comparison, monthly–annual toggle, KSh pricing |
| 9 | `/connect/onboarding/first-listing` | Guided single product with quantity price bands, MOQ, lead time, regions — beside a live preview of the card hardware shops will see |
| 10 | `/connect/dashboard` | Activation checklist ("5 of 6 complete"), verification banner, catalogue, next-best actions |

### The verification pipeline (step 7)

| Check | Authority | Target SLA |
| --- | --- | --- |
| Document completeness | Buildex Operations | 4 hours |
| BRS company lookup | Business Registration Service | 1 working day |
| KRA PIN validation | Kenya Revenue Authority | 1 working day |
| Director identity | Integrated Population Registration Services | 2 working days |
| Physical site visit | Buildex Field Team | 5 working days (conditional) |

The site visit is triggered only for higher-risk applications — a company registered
within the last two years, or one declaring under KSh 5M monthly output. A current KEBS
Standardisation Mark waives it, on the basis that a regulator has already inspected the
plant.

### Cross-cutting behaviour

- Progress saves per step. Refresh, "Save & exit", or returning days later all resume at
  the right place.
- `/connect/onboarding` is a resume link — it sends the applicant to the furthest step
  their draft supports.
- Deep links are clamped: a pasted URL for a step the draft cannot justify redirects back,
  so no form ever renders with nothing behind it.
- Backward navigation is always allowed; forward is gated by validation.

### Edge states (all built)

| State | How it behaves |
| --- | --- |
| **Duplicate KRA PIN** | Live registry lookup on blur. Names the existing company, blocks Continue, offers a support route |
| **Expired document** | Tax compliance certificate past validity is rejected from the pack; the step says exactly what is still needed |
| **Rejected verification** | Itemised reasons; only the failing documents need replacing. Re-uploading returns the affected checks to the queue |
| **Conditional approval** | May list products, may not transact. Listings created meanwhile stay as drafts and go live automatically when checks clear |
| **IPRS mismatch** | Flagged per director with guidance; ops follows up after submission |
| **Shareholding does not reconcile** | Blocks the step, showing over/short by how much — the commonest sign of a fabricated structure |

---

## Journey B — Manufacturer Growth (Phase 2)

Sign in → `/connect/catalogue` → add a listing with quantity price bands (same form and
same buyer preview as onboarding) → `/connect/insights` shows which listings draw views
but no enquiries → `/connect/campaigns` builds a Kakamega + Kisumu campaign, showing shop
coverage, blended CPM and projected enquiries *before* committing budget → enquiries
arrive in `/connect/orders` → quote one against the buyer's own quantity band → mark it
accepted.

Gating is real throughout: listing caps come from the package (10 on Free, 50 on Basic),
and regional targeting is Premium-and-above. Bulk CSV import is the one piece deferred.

---

## Journey C — Buildex Ops Verification (Phase 3)

Console → verification queue sorted by SLA breach risk → open a submission → review each
document alongside its extracted fields → run the BRS / KRA / IPRS checks → decide:
approve, reject with reasons, request more information, or flag for a site visit →
decision written to the audit trail → the manufacturer's tracker (Journey A step 7)
updates and an SMS goes out.

---

## Journey D — Hardware Shop Sourcing 🟡 Partly built *(Phases 2 and 4)*

**Built now (browse and enquire):** `/marketplace` → search or filter by category and
delivery region → open a listing → type the quantity actually wanted and watch the
price-band table highlight the band it falls into, with the line total → compare against
comparable listings from other suppliers, shown cheapest-first → **Visit store** for the
supplier's full range, terms and trading record → send a quote request.

**Phase 4 adds (account and ordering):** shop registration with KYB and owner ID
verification, cart, order placement, fulfilment tracking, delivery notes, and inventory
that begins feeding stock-velocity data.

---

## Journey E — Hardware Shop Credit (Phase 5)

Dashboard shows an eligibility tracker — months on platform, share of turnover processed
through Buildex, KYB status, CRB status → thresholds met → apply for a facility → see the
score, risk grade and recommended limit → choose a 5, 10 or 14-day tenor with the cost
difference disclosed line by line → accept → the limit becomes available at checkout →
order on credit → POS collections flow into the wallet → auto-sweep on the due date, or
repay manually → limit resets on clearance → download a statement.

Also specified: partial repayment, insufficient wallet balance at sweep, and a loan ageing
into DPD 1–30.

---

## Journey F — Credit & Risk Officer (Phase 6)

Underwriting queue → open an application → inspect the scorecard by feature group with
contributing factors → compare the requested tenor against the shop's actual
cash-conversion cycle → approve, or override the limit with a mandatory reason → monitor
the portfolio (outstanding, utilisation, DPD buckets, NPL) → a loan hits DPD 7 → open the
collections workflow across the 37-day recovery cycle → record recovery or write-off →
review pilot metrics against target.

---

## Journey G — End Consumer (Phase 8)

Buys paint at a Buildex-POS hardware shop → consents to marketing → receives an SMS about
the predicted next construction stage with a deep link → lands on that shop's storefront →
the purchase is attributed back to campaign, hardware shop and manufacturer.

This closes the manufacturer → Buildex → hardware → POS → consumer data chain that the
whole ecosystem argument rests on.

---

## How the journeys interlock

```text
Journey A (manufacturer onboards)
        │
        ▼
Journey C (ops verifies) ──────────► manufacturer goes live
        │
        ▼
Journey B (manufacturer lists, targets regions, reads the market)
        │
        ▼
Journey D (hardware shop discovers and orders)  ◄──── Journey E (credit funds the order)
        │                                                      ▲
        ▼                                                      │
POS transaction captured ─────────────────────────► Journey F (underwriting improves)
        │
        ▼
Journey G (consumer re-engaged, attribution closes the loop)
```

Every transaction improves the quality of the next decision — better credit scoring,
better stock recommendations, better market intelligence for manufacturers.
