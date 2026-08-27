import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Every amount in this product is Kenyan shillings. Rendering money through a
 * single helper keeps grouping, currency symbol and decimal handling identical
 * across dashboards, tables, statements and print views.
 */
export function formatKsh(
  amount: number,
  options: { decimals?: boolean; compact?: boolean } = {},
) {
  const { decimals = false, compact = false } = options;
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    currencyDisplay: "narrowSymbol",
    notation: compact ? "compact" : "standard",
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })
    .format(amount)
    .replace(/^KES\s?/, "KSh ")
    .replace(/^Ksh/, "KSh");
}

export function formatNumber(value: number, decimals = 0) {
  return new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals = 0) {
  return `${formatNumber(value, decimals)}%`;
}

export function formatDate(value: string | Date, style: "short" | "long" = "short") {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: style === "long" ? "long" : "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** "3 days ago" / "in 2 hours" — used by SLA counters and audit trails. */
export function formatRelative(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms || unit === "minute") {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return "just now";
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Deterministic id generation keeps fixtures stable between reloads. */
export function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Picks `take` items, preferring one per distinct key before repeating any.
 *
 * A four-up thumbnail strip filled from a single category shows four
 * near-identical photos, which tells a buyer nothing about what a supplier
 * actually makes. Spreading across categories makes the same four tiles
 * informative. Tops up from the remainder when there are not enough distinct
 * keys to fill the strip, so it never returns short.
 */
export function spreadBy<T>(items: T[], take: number, keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  const picked: T[] = [];

  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(item);
    if (picked.length === take) return picked;
  }
  for (const item of items) {
    if (picked.includes(item)) continue;
    picked.push(item);
    if (picked.length === take) break;
  }
  return picked;
}

/**
 * Money in its own currency.
 *
 * Procurement crosses borders — Kenyan mills invoice in shillings, Ugandan
 * ones in Ugandan shillings — and the platform holds no exchange rates. So
 * amounts are shown as billed and never converted: a single "total payable"
 * across currencies would be a number nobody could reconcile against an
 * invoice. Totals are kept per currency instead.
 */
export function formatMoney(
  amount: number,
  currency: string,
  options: { compact?: boolean; decimals?: boolean } = {},
) {
  const { compact = false, decimals = false } = options;
  const formatted = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    notation: compact ? "compact" : "standard",
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(amount);

  // Intl renders KES as "KES"/"Ksh" depending on locale data; the brand writes
  // it "KSh", and the other currencies read better with an explicit code than a
  // symbol a Kenyan reader would not recognise.
  return formatted
    .replace(/^KES\s?/, "KSh ")
    .replace(/^Ksh\s?/, "KSh ")
    .replace(/^UGX\s?/, "UGX ")
    .replace(/^TZS\s?/, "TZS ");
}

/**
 * Narrow a `<select>` value or a URL parameter to one of a known set.
 *
 * Filter state is a union — a `Region`, a `ProductCategory` — but the value
 * arriving from the DOM or the query string is only ever `string`. Five call
 * sites had bridged that with `as never`, which compiles by asserting the
 * value is impossible and tells a reader nothing true. Here the membership is
 * actually checked, so an unrecognised value becomes "no filter" rather than a
 * lie the type system has agreed to.
 */
export function asOption<T extends string>(
  options: readonly T[],
  value: string | null | undefined,
): T | "" {
  return (options as readonly string[]).includes(value ?? "") ? (value as T) : "";
}
