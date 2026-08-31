import {
  isBusinessType,
  type Customer,
  type VerificationLevel,
} from "@/lib/schemas/customer";
import type { RegistrationDraft, RegistrationStepId } from "@/lib/data/types";

/*
  Customer verification and profile rules — Chapter 9 §9.4, §9.6.

  Kept out of both the schema and the components for the same reason the
  manufacturer's rules are: the dashboard, the account screens, the access gate
  and the admin console all need the same answers, and three copies of "is this
  profile complete" is how they start disagreeing.
*/

// ---------------------------------------------------------------------------
// Registration wizard — §9.3
// ---------------------------------------------------------------------------

/*
  Four steps, in this order, and no more.

  §9.3 frames entry as three moves — create an account, choose a membership,
  start searching — and the fourth here (phone verification) is the one §9.4
  makes mandatory. Anything else a customer might tell us is asked for later,
  on the account screens, where it is optional and has a visible reason.
*/
export const REGISTRATION_STEP_ORDER: RegistrationStepId[] = [
  "account",
  "verify-phone",
  "profile",
  "membership",
];

export function registrationStepIndex(step: RegistrationStepId) {
  return REGISTRATION_STEP_ORDER.indexOf(step);
}

/**
 * The furthest step the draft's own data justifies.
 *
 * Same job as `furthestReachableStep` on the supplier side: a pasted URL for a
 * step with nothing behind it renders a form that cannot be submitted, so the
 * wizard sends the visitor to the last step their data actually supports.
 */
export function furthestReachableRegistrationStep(
  draft: RegistrationDraft,
): RegistrationStepId {
  if (!draft.account) return "account";
  if (!draft.phoneVerified) return "verify-phone";
  if (!draft.profile) return "profile";
  return "membership";
}

/** What a customer's commercial record looks like to the level rules. */
export type CommercialHistory = {
  orders: number;
  valueKsh: number;
  /** Months between the first order and the most recent one. */
  monthsActive: number;
};

export const NO_HISTORY: CommercialHistory = {
  orders: 0,
  valueKsh: 0,
  monthsActive: 0,
};

/*
  Thresholds for `trusted_business`.

  Chapter 9 says only "meaningful commercial history and deeper verification",
  which is a policy decision rather than an engineering one. These are the
  concrete proposal — deliberately in one named place so they can be argued
  with and changed, rather than buried as literals inside a condition. §9.21
  requires the methodology to be "understandable and reviewable"; that starts
  here.
*/
export const TRUSTED_BUSINESS_THRESHOLDS = {
  orders: 6,
  valueKsh: 500_000,
  monthsActive: 3,
} as const;

/**
 * Is the account holding everything §9.4 marks mandatory?
 *
 * Address and county are in this list on purpose. The chapter calls the
 * physical address "a strategic marketplace field because construction demand,
 * suppliers and fulfilment are geographically anchored" — an account without
 * one cannot be matched to a supplier who can actually reach it.
 */
export function hasCompleteProfile(customer: Customer) {
  const core =
    customer.emailVerified &&
    customer.phoneVerified &&
    customer.physicalAddress.trim().length > 3 &&
    customer.town.trim().length > 1;

  if (!isBusinessType(customer.customerType)) return core;
  return core && customer.business !== null;
}

/** The named things still missing, for the dashboard's completion prompt. */
export function profileGaps(customer: Customer): string[] {
  const gaps: string[] = [];
  if (!customer.emailVerified) gaps.push("Confirm your email address");
  if (!customer.phoneVerified) gaps.push("Verify your phone number");
  if (customer.physicalAddress.trim().length <= 3) gaps.push("Add your physical address");
  if (customer.town.trim().length <= 1) gaps.push("Add your town or city");
  if (isBusinessType(customer.customerType) && !customer.business) {
    gaps.push("Add your business registration details");
  }
  if (isBusinessType(customer.customerType) && customer.business && !customer.business.verifiedAt) {
    gaps.push("Verify your business with KRA and BRS");
  }
  return gaps;
}

/** 0–100. Used by the dashboard bar and the Trust Profile's identity dimension. */
export function profileCompleteness(customer: Customer) {
  const checks = [
    customer.emailVerified,
    customer.phoneVerified,
    customer.physicalAddress.trim().length > 3,
    customer.town.trim().length > 1,
    isBusinessType(customer.customerType) ? customer.business !== null : true,
    isBusinessType(customer.customerType)
      ? customer.business?.verifiedAt != null
      : true,
  ];
  const met = checks.filter(Boolean).length;
  return Math.round((met / checks.length) * 100);
}

/**
 * The level this account has *earned* — §9.6.
 *
 * Derived, never set by the customer, and never bought. §9.42 is explicit:
 * "Membership does not equal trust; trust is earned." A BUILD BUSINESS
 * subscriber who has verified nothing is still `registered`, and the access
 * gate reads both values rather than assuming one implies the other.
 *
 * `strategic` is the one exception: it means a contractual relationship and
 * enhanced due diligence carried out by people, so it is an administrative
 * grant that outranks derivation — the same shape as `isAdministrativeHold()`
 * on the supplier side, and for the same reason. Recomputing would silently
 * demote a negotiated enterprise account.
 */
export function deriveVerificationLevel(
  customer: Customer,
  history: CommercialHistory = NO_HISTORY,
): VerificationLevel {
  if (customer.verificationLevel === "strategic") return "strategic";

  if (!customer.emailVerified || !customer.phoneVerified) return "registered";
  if (!hasCompleteProfile(customer)) return "registered";

  const businessVerified = customer.business?.verifiedAt != null;

  const tradesEnough =
    history.orders >= TRUSTED_BUSINESS_THRESHOLDS.orders &&
    history.valueKsh >= TRUSTED_BUSINESS_THRESHOLDS.valueKsh &&
    history.monthsActive >= TRUSTED_BUSINESS_THRESHOLDS.monthsActive;

  if (businessVerified && tradesEnough) return "trusted_business";
  return "verified_member";
}

/**
 * What would move this account to the next level.
 *
 * The chapter asks for progression to be legible (§9.21: "understandable and
 * reviewable"), and a level that changes with no stated reason is the opposite
 * of that. Returns null at the top of the earnable ladder — `strategic` is
 * negotiated, not achieved, so there is nothing honest to promise.
 */
export function nextLevelRequirements(
  customer: Customer,
  history: CommercialHistory = NO_HISTORY,
): { level: VerificationLevel; needs: string[] } | null {
  const level = deriveVerificationLevel(customer, history);

  if (level === "registered") {
    return { level: "verified_member", needs: profileGaps(customer) };
  }

  if (level === "verified_member") {
    const needs: string[] = [];
    if (!customer.business) {
      needs.push("Add and verify your business registration details");
    } else if (!customer.business.verifiedAt) {
      needs.push("Complete business verification with KRA and BRS");
    }
    const { orders, valueKsh, monthsActive } = TRUSTED_BUSINESS_THRESHOLDS;
    if (history.orders < orders) {
      needs.push(`Complete ${orders - history.orders} more orders on the platform`);
    }
    if (history.valueKsh < valueKsh) {
      needs.push("Build more trading value through Buildex Connect");
    }
    if (history.monthsActive < monthsActive) {
      needs.push(`Keep trading — ${monthsActive} months of history is the threshold`);
    }
    return { level: "trusted_business", needs };
  }

  return null;
}
