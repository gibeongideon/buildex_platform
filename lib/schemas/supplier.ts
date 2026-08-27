import { z } from "zod";

/*
  Buildex Interiors' own suppliers — the companies Buildex buys *from*.

  Not to be confused with Buildex Connect's manufacturers, who are suppliers to
  the marketplace's buyers. These are procurement vendors: plywood mills,
  gypsum merchants, hauliers and the customs agents who clear timber at the
  Uganda border. Different relationship, different money direction, different
  screen.

  Trade here crosses borders, so a vendor carries its own currency and amounts
  are never converted — see `lib/rules/procurement.ts` for why.
*/

export const VENDOR_COUNTRIES = ["Kenya", "Uganda", "Tanzania", "China"] as const;
export const vendorCountrySchema = z.enum(VENDOR_COUNTRIES);
export type VendorCountry = z.infer<typeof vendorCountrySchema>;

export const CURRENCIES = ["KES", "UGX", "TZS", "USD"] as const;
export const currencySchema = z.enum(CURRENCIES);
export type Currency = z.infer<typeof currencySchema>;

/** The currency a country's vendors invoice in by default. */
export const COUNTRY_CURRENCY: Record<VendorCountry, Currency> = {
  Kenya: "KES",
  Uganda: "UGX",
  Tanzania: "TZS",
  China: "USD",
};

/**
 * What a vendor supplies. Procurement reads very differently by type: a mill
 * has lead times and quality claims, a haulier has routes, a clearing agent has
 * neither and is judged purely on how long a consignment sits at the border.
 */
export const VENDOR_TYPES = [
  "Timber & boards",
  "Gypsum & ceilings",
  "Hardware & fittings",
  "Engineering & fabrication",
  "Transport & haulage",
  "Border clearance",
  "Services",
] as const;
export const vendorTypeSchema = z.enum(VENDOR_TYPES);
export type VendorType = z.infer<typeof vendorTypeSchema>;

export const VENDOR_STATUSES = ["active", "on_hold", "inactive"] as const;
export const vendorStatusSchema = z.enum(VENDOR_STATUSES);
export type VendorStatus = z.infer<typeof vendorStatusSchema>;

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  inactive: "Inactive",
};

export const VENDOR_STATUS_TONE: Record<
  VendorStatus,
  "success" | "warning" | "neutral"
> = {
  active: "success",
  on_hold: "warning",
  inactive: "neutral",
};

export const vendorSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2, "Enter the vendor's name"),
  /*
    Contact fields are nullable on purpose. Real procurement ledgers are full of
    vendors captured mid-transaction with nothing but a name, and pretending
    otherwise would mean inventing the missing halves.
  */
  phone: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  city: z.string().nullable().default(null),
  country: vendorCountrySchema.nullable().default(null),
  currency: currencySchema,
  type: vendorTypeSchema,
  status: vendorStatusSchema,
  /** Agreed payment window in days; null when nothing was ever agreed. */
  paymentTermDays: z.number().int().min(0).nullable().default(null),
  notes: z.string().default(""),
  createdAt: z.string(),
});

export type Vendor = z.infer<typeof vendorSchema>;

export const BILL_STATUSES = ["draft", "posted", "partly_paid", "paid"] as const;
export const billStatusSchema = z.enum(BILL_STATUSES);
export type BillStatus = z.infer<typeof billStatusSchema>;

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  draft: "Draft",
  posted: "Awaiting payment",
  partly_paid: "Part paid",
  paid: "Paid",
};

export const BILL_STATUS_TONE: Record<
  BillStatus,
  "neutral" | "warning" | "info" | "success"
> = {
  draft: "neutral",
  posted: "warning",
  partly_paid: "info",
  paid: "success",
};

export const vendorBillSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  /** The vendor's own invoice number, as written on the document. */
  reference: z.string(),
  currency: currencySchema,
  /** Always in the bill's own currency. Never converted. */
  amount: z.number().min(0),
  amountPaid: z.number().min(0).default(0),
  billDate: z.string(),
  dueDate: z.string(),
  status: billStatusSchema,
  description: z.string().default(""),
});

export type VendorBill = z.infer<typeof vendorBillSchema>;

export function outstanding(bill: VendorBill) {
  return Math.max(0, bill.amount - bill.amountPaid);
}

/**
 * Overdue means posted or part paid, still owed, and the due *date* has passed.
 *
 * Compared by date rather than timestamp on purpose. Comparing instants made a
 * bill due at 09:00 "late" by lunchtime on the day it fell due, which is not
 * how anyone reading an invoice thinks — and it put such a bill in two places
 * at once, counted as overdue while the ageing view still called it current.
 * A bill is late the day *after* it was due.
 */
export function isOverdue(bill: VendorBill, now = Date.now()) {
  if (bill.status === "paid" || bill.status === "draft") return false;
  if (outstanding(bill) <= 0) return false;
  const due = new Date(bill.dueDate);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < now;
}

/** Whole days past the due date. At least 1 whenever the bill is overdue. */
export function daysOverdue(bill: VendorBill, now = Date.now()) {
  if (!isOverdue(bill, now)) return 0;
  const due = new Date(bill.dueDate);
  due.setHours(23, 59, 59, 999);
  return Math.max(1, Math.ceil((now - due.getTime()) / 86_400_000));
}
