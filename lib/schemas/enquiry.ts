import { z } from "zod";
import { countySchema, email, kenyanPhone, regionSchema } from "./common";

/*
  A hardware shop asking a manufacturer for a price on a quantity.

  This is the marketplace's core transaction primitive. Wholesale construction
  supply rarely completes at list price — a shop states the quantity it wants,
  the manufacturer quotes against its own bands, and the two converge. Modelling
  the enquiry (rather than jumping straight to an order) is what makes the
  quantity-band pricing in `product.ts` meaningful.
*/

export const ENQUIRY_STATUSES = [
  "new",
  "quoted",
  "accepted",
  "declined",
  "closed",
] as const;

export const enquiryStatusSchema = z.enum(ENQUIRY_STATUSES);
export type EnquiryStatus = z.infer<typeof enquiryStatusSchema>;

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: "New",
  quoted: "Quoted",
  accepted: "Accepted",
  declined: "Declined",
  closed: "Closed",
};

export const ENQUIRY_STATUS_TONE: Record<
  EnquiryStatus,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  new: "warning",
  quoted: "info",
  accepted: "success",
  declined: "danger",
  closed: "neutral",
};

export const enquirySchema = z.object({
  id: z.string(),
  manufacturerId: z.string(),
  productId: z.string(),
  /** Denormalised so an enquiry still reads correctly if a listing is archived. */
  productName: z.string(),

  shopName: z.string().trim().min(2, "Enter your hardware shop's name"),
  contactName: z.string().trim().min(2, "Enter a contact name"),
  phone: kenyanPhone,
  email,
  county: countySchema,
  region: regionSchema,

  quantity: z.number().int().positive("Enter the quantity you need"),
  unit: z.string(),
  message: z.string().trim().max(600).default(""),
  /** When the shop needs delivery — drives how the manufacturer prioritises. */
  neededBy: z.string().nullable().default(null),

  status: enquiryStatusSchema,
  createdAt: z.string(),
  respondedAt: z.string().nullable().default(null),

  /** Set when the manufacturer quotes. */
  quotedUnitPrice: z.number().positive().nullable().default(null),
  quotedLeadTimeDays: z.number().int().min(0).nullable().default(null),
  quoteNote: z.string().nullable().default(null),
});

export type Enquiry = z.infer<typeof enquirySchema>;

/** The form a hardware shop fills in on a product page. */
export const enquiryFormSchema = z.object({
  shopName: z.string().trim().min(2, "Enter your hardware shop's name"),
  contactName: z.string().trim().min(2, "Enter a contact name"),
  phone: kenyanPhone,
  email,
  county: countySchema,
  quantity: z.number().int().positive("Enter the quantity you need"),
  message: z.string().trim().max(600),
});

export type EnquiryForm = z.infer<typeof enquiryFormSchema>;

export function enquiryValue(enquiry: Enquiry, fallbackUnitPrice: number) {
  return (enquiry.quotedUnitPrice ?? fallbackUnitPrice) * enquiry.quantity;
}
