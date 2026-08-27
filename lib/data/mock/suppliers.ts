import {
  isOverdue,
  outstanding,
  type Vendor,
  type VendorBill,
} from "@/lib/schemas/supplier";
import { vendorIssues } from "@/lib/rules/procurement";
import { sleep } from "@/lib/utils";
import type { BillFilter, SupplierRepo, VendorFilter } from "@/lib/data/types";
import { getSnapshot, mutate } from "./db";
import { FAST, NORMAL } from "./latency";

/*
  The purchase ledger, mocked.

  Reads take one pass and index what they need, the same shape as
  `lib/data/mock/admin.ts` — the payables table needs a figure per vendor, and
  a repository call per vendor is the obvious way to make that page slow.
*/

function matchesVendor(vendor: Vendor, filter: VendorFilter) {
  if (filter.status && vendor.status !== filter.status) return false;
  if (filter.country && vendor.country !== filter.country) return false;
  if (filter.type && vendor.type !== filter.type) return false;
  if (filter.incompleteOnly && vendorIssues(vendor).length === 0) return false;
  const q = filter.query?.trim().toLowerCase();
  if (q) {
    const haystack = [vendor.name, vendor.email, vendor.phone, vendor.city, vendor.country]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

function matchesBill(bill: VendorBill, vendor: Vendor | undefined, filter: BillFilter) {
  if (filter.vendorId && bill.vendorId !== filter.vendorId) return false;
  if (filter.status && bill.status !== filter.status) return false;
  if (filter.overdueOnly && !isOverdue(bill)) return false;
  const q = filter.query?.trim().toLowerCase();
  if (q) {
    const haystack = [bill.reference, bill.description, vendor?.name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export const supplierRepo: SupplierRepo = {
  async listVendors(filter: VendorFilter = {}) {
    await sleep(NORMAL);
    return getSnapshot()
      .vendors.filter((v) => matchesVendor(v, filter))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async getVendor(id) {
    await sleep(FAST);
    return getSnapshot().vendors.find((v) => v.id === id) ?? null;
  },

  async updateVendor(id, patch) {
    await sleep(FAST);
    let updated: Vendor | undefined;
    mutate((db) => ({
      ...db,
      vendors: db.vendors.map((v) => {
        if (v.id !== id) return v;
        updated = { ...v, ...patch };
        return updated;
      }),
    }));
    if (!updated) throw new Error(`Vendor not found: ${id}`);
    return updated;
  },

  async listBills(filter: BillFilter = {}) {
    await sleep(NORMAL);
    const { vendorBills, vendors } = getSnapshot();
    const byId = new Map(vendors.map((v) => [v.id, v]));
    return vendorBills
      .filter((b) => matchesBill(b, byId.get(b.vendorId), filter))
      .sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime());
  },

  async vendorRows(filter: VendorFilter = {}) {
    await sleep(NORMAL);
    const { vendors, vendorBills } = getSnapshot();

    const owed = new Map<string, number>();
    const count = new Map<string, number>();
    const overdue = new Map<string, number>();
    const last = new Map<string, string>();

    for (const bill of vendorBills) {
      count.set(bill.vendorId, (count.get(bill.vendorId) ?? 0) + 1);
      if (bill.status !== "draft") {
        owed.set(bill.vendorId, (owed.get(bill.vendorId) ?? 0) + outstanding(bill));
      }
      if (isOverdue(bill)) {
        overdue.set(bill.vendorId, (overdue.get(bill.vendorId) ?? 0) + 1);
      }
      const seen = last.get(bill.vendorId);
      if (!seen || new Date(bill.billDate) > new Date(seen)) {
        last.set(bill.vendorId, bill.billDate);
      }
    }

    return vendors
      .filter((v) => matchesVendor(v, filter))
      .map((vendor) => ({
        vendor,
        bills: count.get(vendor.id) ?? 0,
        outstanding: owed.get(vendor.id) ?? 0,
        overdueBills: overdue.get(vendor.id) ?? 0,
        lastBillAt: last.get(vendor.id) ?? null,
      }))
      // Anything overdue first, then by what is owed — a payables table is read
      // to decide who to pay next, not to browse alphabetically.
      .sort(
        (a, b) =>
          b.overdueBills - a.overdueBills ||
          b.outstanding - a.outstanding ||
          a.vendor.name.localeCompare(b.vendor.name),
      );
  },
};
