import {
  COUNTRY_CURRENCY,
  daysOverdue,
  isOverdue,
  outstanding,
  type Currency,
  type Vendor,
  type VendorBill,
} from "@/lib/schemas/supplier";

/*
  Procurement rules.

  Two things live here that the screens must not decide for themselves: what
  counts as an incomplete vendor record, and the fact that money is never
  converted between currencies.
*/

/**
 * Totals are per currency, never summed across them.
 *
 * The platform holds no exchange rates, and a rate invented to make one tidy
 * "total payable" would produce a number nobody could reconcile against an
 * invoice — worse than showing two numbers, because it looks authoritative.
 * Every total in the procurement screens is therefore a map keyed by currency.
 */
export function totalByCurrency(
  bills: VendorBill[],
  pick: (bill: VendorBill) => number,
) {
  const totals = new Map<Currency, number>();
  for (const bill of bills) {
    totals.set(bill.currency, (totals.get(bill.currency) ?? 0) + pick(bill));
  }
  // Largest first, so the currency carrying the most money leads.
  return [...totals.entries()]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);
}

export type VendorIssue = {
  key: string;
  label: string;
  detail: string;
  severity: "high" | "medium" | "low";
};

/**
 * What is wrong with a vendor record as captured.
 *
 * Ledgers accumulate vendors created mid-payment with nothing but a name, and
 * addresses that contradict the country field. Nothing here rewrites the
 * record — the console's job is to show finance what needs completing, not to
 * quietly diverge from the source system.
 */
export function vendorIssues(vendor: Vendor): VendorIssue[] {
  const issues: VendorIssue[] = [];

  if (!vendor.phone && !vendor.email) {
    issues.push({
      key: "no_contact",
      label: "No contact details",
      detail: "Neither a phone number nor an email address. Nobody can chase a query.",
      severity: "high",
    });
  }

  if (!vendor.country) {
    issues.push({
      key: "no_country",
      label: "No country",
      detail: "Country is blank, so the billing currency is a default rather than a fact.",
      severity: "medium",
    });
  }

  // A dialling code that is only a country prefix, or otherwise too short to
  // call. Kept as a check rather than a validator: the record is not rejected.
  if (vendor.phone && vendor.phone.replace(/\D/g, "").length < 9) {
    issues.push({
      key: "short_phone",
      label: "Phone number incomplete",
      detail: `"${vendor.phone}" is a dialling prefix, not a reachable number.`,
      severity: "medium",
    });
  }

  /*
    A city that belongs to one country filed under another. Worth flagging
    because it decides which currency the vendor bills in, and which side of a
    border a consignment clears.
  */
  const CITY_COUNTRY: Record<string, string> = {
    kampala: "Uganda",
    luzira: "Uganda",
    entebbe: "Uganda",
    jinja: "Uganda",
    "dar es salaam": "Tanzania",
    arusha: "Tanzania",
  };
  const implied = vendor.city ? CITY_COUNTRY[vendor.city.trim().toLowerCase()] : undefined;
  if (implied && vendor.country && implied !== vendor.country) {
    issues.push({
      key: "country_mismatch",
      label: "Country contradicts the city",
      detail: `${vendor.city} is in ${implied}, but the record says ${vendor.country}.`,
      severity: "high",
    });
  }

  if (vendor.country && vendor.currency !== COUNTRY_CURRENCY[vendor.country]) {
    issues.push({
      key: "currency_mismatch",
      label: "Currency is not the country's",
      detail: `Billed in ${vendor.currency} while filed under ${vendor.country}. Deliberate for cross-border vendors, worth confirming.`,
      severity: "low",
    });
  }

  if (vendor.paymentTermDays === null) {
    issues.push({
      key: "no_terms",
      label: "No payment terms agreed",
      detail: "Bills from this vendor have no due date to hold anyone to.",
      severity: "medium",
    });
  }

  return issues;
}

/** Standard accounts-payable ageing buckets. */
export const AGEING_BUCKETS = [
  { key: "current", label: "Not yet due", min: -Infinity, max: 0 },
  { key: "1_30", label: "1–30 days", min: 1, max: 30 },
  { key: "31_60", label: "31–60 days", min: 31, max: 60 },
  { key: "61_90", label: "61–90 days", min: 61, max: 90 },
  { key: "over_90", label: "Over 90 days", min: 91, max: Infinity },
] as const;

export function ageingBucket(bill: VendorBill, now = Date.now()) {
  if (!isOverdue(bill, now)) return "current";
  const days = daysOverdue(bill, now);
  /*
    Searched over the overdue buckets only. "Not yet due" is decided by
    `isOverdue` above and nothing else — leaving it in the range search let a
    bill that was overdue by less than a day match `current` as well, so the
    same money was counted twice and the buckets stopped summing to the total.
  */
  const bucket = AGEING_BUCKETS.filter((b) => b.key !== "current").find(
    (b) => days >= b.min && days <= b.max,
  );
  return bucket?.key ?? "over_90";
}

/** Everything still owed on a set of bills, per currency. */
export function payableByCurrency(bills: VendorBill[]) {
  return totalByCurrency(
    bills.filter((b) => b.status !== "draft"),
    outstanding,
  );
}
