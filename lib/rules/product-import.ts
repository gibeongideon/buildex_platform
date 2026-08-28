import { PRODUCT_CATEGORIES, REGIONS } from "@/lib/schemas/common";
import type { ProductCategory, Region } from "@/lib/schemas/common";
import {
  PRODUCT_UNITS,
  listingDraftSchema,
  type ListingFields,
  type PriceBand,
} from "@/lib/schemas/product";

/*
  Bulk catalogue import.

  A supplier with two hundred SKUs is not going to type them into a form two
  hundred times, so the catalogue takes a spreadsheet. The parser is deliberate
  about three things:

  1. It validates every row against `listingDraftSchema` — the same rules the
     single-product form uses. An import cannot introduce a listing the form
     would have rejected, including the price-band tiling rules.
  2. It reports errors per row, by line number and column, and imports nothing
     until the supplier has seen them. A partial import of a price list is
     worse than none: you cannot tell which half is live.
  3. It reads what people actually paste. Excel writes a BOM, Windows writes
     CRLF, and a product name like `Blockboard 18mm (2440 × 1220), sanded`
     arrives quoted with an embedded comma.

  Price bands are the one field that has no natural flat representation, so they
  use a documented micro-syntax: `1-99:750 | 100-499:720 | 500+:690`. That reads
  the way a trade price list is already written, which matters more than being
  clever — the supplier is transcribing from one.
*/

/** Separates the bands within the price column. */
const BAND_SEPARATOR = "|";

export type ImportColumn = {
  key: string;
  /** What the header must say, lowercased and trimmed on both sides. */
  header: string;
  required: boolean;
  hint: string;
};

export const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "name", header: "name", required: true, hint: "Product name" },
  {
    key: "category",
    header: "category",
    required: true,
    hint: `One of: ${PRODUCT_CATEGORIES.join(", ")}`,
  },
  { key: "sku", header: "sku", required: true, hint: "Your own stock code" },
  { key: "description", header: "description", required: false, hint: "Optional, up to 600 characters" },
  { key: "unit", header: "unit", required: true, hint: `One of: ${PRODUCT_UNITS.join(", ")}` },
  { key: "packSize", header: "pack size", required: false, hint: 'e.g. "50 kg"' },
  {
    key: "priceBands",
    header: "price bands",
    required: true,
    hint: '1-99:750 | 100-499:720 | 500+:690 — bands must tile without gaps and step down',
  },
  { key: "moq", header: "moq", required: true, hint: "Minimum order quantity" },
  { key: "leadTimeDays", header: "lead time days", required: true, hint: "0–120" },
  {
    key: "availableRegions",
    header: "regions",
    required: true,
    hint: `Semicolon-separated. One or more of: ${REGIONS.join(", ")}`,
  },
  {
    key: "isMainProduct",
    header: "main product",
    required: false,
    hint: "yes / no — at most four across your catalogue",
  },
];

export type RowError = { line: number; column?: string; message: string };

export type ImportResult = {
  /** Rows that passed every rule the single-product form applies. */
  drafts: ListingFields[];
  errors: RowError[];
  /** Data rows seen, excluding the header. */
  totalRows: number;
};

/**
 * A tolerant delimited-text reader: quoted fields, embedded delimiters,
 * doubled quotes, CRLF, and a UTF-8 BOM.
 */
export function parseDelimited(text: string): string[][] {
  const body = text.replace(/^﻿/, "");
  // Tab-separated is what "Save as Unicode Text" and a paste out of Excel give.
  const delimiter = body.split("\n")[0]?.includes("\t") ? "\t" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];

    if (quoted) {
      if (char === '"') {
        if (body[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Trailing blank lines are an artefact of every editor; they are not rows.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** `1-99:750 | 100-499:720 | 500+:690` */
export function parsePriceBands(input: string): PriceBand[] | string {
  const parts = input
    .split(BAND_SEPARATOR)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return "No price bands given";

  const bands: PriceBand[] = [];
  for (const part of parts) {
    const match = part.match(/^(\d[\d,]*)\s*(?:-\s*(\d[\d,]*)|(\+))?\s*:\s*([\d,]+(?:\.\d+)?)$/);
    if (!match) {
      return `Could not read the band "${part}" — expected 1-99:750 or 500+:690`;
    }
    const [, min, max, openEnded, price] = match;
    const num = (v: string) => Number(v.replace(/,/g, ""));
    bands.push({
      minQty: num(min),
      maxQty: openEnded ? null : max ? num(max) : num(min),
      unitPrice: num(price),
    });
  }
  return bands;
}

function parseList(input: string): string[] {
  return input
    .split(/[;|]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

const TRUTHY = new Set(["yes", "y", "true", "1", "main"]);
const FALSY = new Set(["", "no", "n", "false", "0"]);

/** Map header cells onto our columns, tolerating case, spacing and underscores. */
function indexHeaders(header: string[]): Map<string, number> {
  const normalise = (v: string) => v.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const found = new Map<string, number>();
  header.forEach((cell, index) => {
    const name = normalise(cell);
    const column = IMPORT_COLUMNS.find((c) => c.header === name);
    if (column) found.set(column.key, index);
  });
  return found;
}

/*
  Zod spells an enum failure by listing every option, which for `category` is a
  three-line wall the supplier has to read to find they typed "Cement" instead
  of "Cement & Concrete". The column's own hint already says what is allowed, so
  say what was wrong and point at that.
*/
function readableIssue(
  issue: { code: string; message: string; path: PropertyKey[] },
  column: ImportColumn | undefined,
  candidate: Record<string, unknown>,
): string {
  const isEnum = issue.code === "invalid_value" || issue.code === "invalid_enum_value";
  if (!isEnum || !column) return issue.message;

  const got = candidate[String(issue.path[0])];
  const shown = Array.isArray(got) ? got.join("; ") : String(got ?? "");
  return shown.trim() === ""
    ? `Required. ${column.hint}`
    : `"${shown}" is not recognised. ${column.hint}`;
}

export function parseProductImport(text: string): ImportResult {
  const rows = parseDelimited(text);
  if (rows.length === 0) {
    return { drafts: [], errors: [{ line: 0, message: "The file is empty." }], totalRows: 0 };
  }

  const columns = indexHeaders(rows[0]);
  const missing = IMPORT_COLUMNS.filter((c) => c.required && !columns.has(c.key));
  if (missing.length > 0) {
    return {
      drafts: [],
      totalRows: 0,
      errors: [
        {
          line: 1,
          message: `The header row is missing: ${missing
            .map((c) => c.header)
            .join(", ")}. Download the template to see the expected columns.`,
        },
      ],
    };
  }

  const drafts: ListingFields[] = [];
  const errors: RowError[] = [];
  const seenSkus = new Set<string>();

  rows.slice(1).forEach((row, index) => {
    // +2: one for the header, one because humans count from one.
    const line = index + 2;
    const cell = (key: string) => (row[columns.get(key) ?? -1] ?? "").trim();

    const bands = parsePriceBands(cell("priceBands"));
    if (typeof bands === "string") {
      errors.push({ line, column: "price bands", message: bands });
      return;
    }

    const mainRaw = cell("isMainProduct").toLowerCase();
    if (mainRaw !== "" && !TRUTHY.has(mainRaw) && !FALSY.has(mainRaw)) {
      errors.push({ line, column: "main product", message: `"${mainRaw}" is not yes or no` });
      return;
    }

    const candidate = {
      name: cell("name"),
      category: cell("category") as ProductCategory,
      sku: cell("sku").toUpperCase(),
      description: cell("description"),
      unit: cell("unit").toLowerCase() as ListingFields["unit"],
      packSize: cell("packSize"),
      priceBands: bands,
      moq: Number(cell("moq").replace(/,/g, "")),
      leadTimeDays: Number(cell("leadTimeDays")),
      availableRegions: parseList(cell("availableRegions")) as Region[],
      isMainProduct: TRUTHY.has(mainRaw),
    };

    const parsed = listingDraftSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        const column = IMPORT_COLUMNS.find((c) => c.key === key);
        errors.push({
          line,
          column: column?.header ?? key,
          message: readableIssue(issue, column, candidate),
        });
      }
      return;
    }

    /*
      A SKU repeated inside one file is the commonest spreadsheet mistake —
      a copied row whose code was never changed — and it would otherwise create
      two listings the supplier cannot tell apart.
    */
    if (seenSkus.has(parsed.data.sku)) {
      errors.push({
        line,
        column: "sku",
        message: `${parsed.data.sku} appears more than once in this file`,
      });
      return;
    }
    seenSkus.add(parsed.data.sku);

    drafts.push(parsed.data);
  });

  return { drafts, errors, totalRows: rows.length - 1 };
}

/** A filled-in example, so the first thing a supplier downloads already works. */
export function importTemplateCsv(): string {
  const header = IMPORT_COLUMNS.map((c) => c.header).join(",");
  const examples = [
    [
      "OPC 32.5N Cement",
      "Cement & Concrete",
      "ACME-OPC325",
      "General purpose Portland cement for masonry and slabs.",
      "bag",
      "50 kg",
      "50-199:760 | 200-499:735 | 500+:710",
      "50",
      "3",
      "Nairobi Metro; Central",
      "yes",
    ],
    [
      "Deformed Bar D12 (12m)",
      "Steel & Reinforcement",
      "ACME-D12",
      "High-yield ribbed reinforcement bar, 12 metre lengths.",
      "piece",
      "12 m",
      "20-99:1180 | 100+:1120",
      "20",
      "5",
      "Nairobi Metro",
      "no",
    ],
  ];

  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [header, ...examples.map((row) => row.map(escape).join(","))].join("\n") + "\n";
}
