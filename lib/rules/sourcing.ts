import { COUNTIES, PRODUCT_CATEGORIES, REGIONS, regionForCounty } from "@/lib/schemas/common";
import type { ProductCategory, Region } from "@/lib/schemas/common";

/*
  Requirement parsing for the Ask AI sourcing assistant.

  This is a deterministic parser over the catalogue's own vocabulary — synonyms
  for each category, county and region names, quantities and urgency — not a
  language model. It is fast, works offline, never invents a supplier, and its
  reasoning can be shown back to the buyer ("matched on: cement, Nakuru, 400
  bags"), which is what actually builds trust in a sourcing tool.

  The UI says so plainly. When a real model is wired in at the backend cutover,
  it replaces `parseRequirement` and everything downstream stays put.
*/

/** Words that should map a requirement onto a catalogue category. */
const CATEGORY_SYNONYMS: Record<ProductCategory, string[]> = {
  "Cement & Concrete": ["cement", "concrete", "opc", "mortar", "screed", "block", "blocks", "paving", "culvert", "lintel", "ballast"],
  "Steel & Reinforcement": ["steel", "rebar", "reinforcement", "bar", "bars", "mesh", "d8", "d10", "d12", "d16", "d20", "hollow section", "shs", "beam"],
  "Timber & Boards": ["timber", "wood", "plywood", "ply", "mdf", "blockboard", "board", "boards", "cypress", "lumber", "veneer"],
  "Paints & Coatings": ["paint", "paints", "emulsion", "gloss", "enamel", "undercoat", "primer", "coating", "varnish", "thinner"],
  Roofing: ["roof", "roofing", "iron sheet", "iron sheets", "mabati", "ibr", "box profile", "ridge", "gutter", "flashing", "tile sheet"],
  "Plumbing & Sanitaryware": ["plumbing", "pipe", "pipes", "ppr", "pvc", "sink", "basin", "toilet", "wc", "tap", "taps", "shower", "tank", "sanitary"],
  Electrical: ["electrical", "cable", "cables", "wire", "wiring", "socket", "switch", "mcb", "breaker", "conduit", "led", "lighting", "earth rod"],
  "Tiles & Flooring": ["tile", "tiles", "flooring", "floor", "porcelain", "ceramic", "vinyl plank"],
  "Doors & Windows": ["door", "doors", "window", "windows", "frame", "shutter", "casement"],
  "Hardware & Fasteners": ["nails", "screws", "bolts", "nuts", "hinge", "hinges", "fastener", "fasteners", "hardware"],
  "Adhesives & Sealants": ["adhesive", "glue", "sealant", "silicone", "grout", "caulk", "bonding"],
  Insulation: ["insulation", "insulate", "underlay", "eps", "thermal"],
  "Glass & Glazing": ["glass", "glazing", "pane", "float glass"],
  "Interior Finishes": ["interior", "finish", "finishes", "mosaic", "texture", "trim", "cornice", "panel"],
};

/** Signals that the buyer needs it soon, which sorts on lead time. */
const URGENT_WORDS = ["urgent", "urgently", "asap", "immediately", "today", "tomorrow", "rush", "quick", "fast", "soon"];
const CHEAP_WORDS = ["cheap", "cheapest", "budget", "affordable", "lowest price", "best price", "economical"];

export type ParsedRequirement = {
  categories: ProductCategory[];
  region: Region | null;
  county: string | null;
  quantity: number | null;
  urgent: boolean;
  priceSensitive: boolean;
  /** Human-readable list of what was recognised, shown back to the buyer. */
  matchedOn: string[];
  /** Terms left over — used as a free-text fallback search. */
  freeText: string;
};

function includesWord(haystack: string, needle: string) {
  // Word-boundary match so "ply" does not fire on "supply".
  return new RegExp(`(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(haystack);
}

export function parseRequirement(input: string): ParsedRequirement {
  const text = ` ${input.toLowerCase().trim()} `;
  const matchedOn: string[] = [];

  const categories: ProductCategory[] = [];
  for (const category of PRODUCT_CATEGORIES) {
    const hit = CATEGORY_SYNONYMS[category].find((word) => includesWord(text, word));
    if (hit) {
      categories.push(category);
      matchedOn.push(hit);
    }
  }

  // County wins over region: it is more specific, and it implies its region.
  let county: string | null = null;
  for (const c of COUNTIES) {
    if (includesWord(text, c.name.toLowerCase())) {
      county = c.name;
      matchedOn.push(c.name);
      break;
    }
  }
  let region: Region | null = county ? ((regionForCounty(county) ?? null) as Region | null) : null;
  if (!region) {
    for (const r of REGIONS) {
      if (text.includes(r.toLowerCase())) {
        region = r;
        matchedOn.push(r);
        break;
      }
    }
  }

  // First plain number that is not part of a product code like "D12" or "32.5N".
  const quantityMatch = text.match(/(^|[^a-z0-9.])(\d[\d,]{1,7})(?![.\d]*\s*(?:mm|kg|m|n|g)\b)/i);
  const quantity = quantityMatch ? Number(quantityMatch[2].replace(/,/g, "")) : null;
  if (quantity) matchedOn.push(`${quantity.toLocaleString("en-KE")} units`);

  const urgent = URGENT_WORDS.some((w) => includesWord(text, w));
  if (urgent) matchedOn.push("urgent");
  const priceSensitive = CHEAP_WORDS.some((w) => text.includes(w));
  if (priceSensitive) matchedOn.push("best price");

  return {
    categories,
    region,
    county,
    quantity,
    urgent,
    priceSensitive,
    matchedOn,
    freeText: input.trim(),
  };
}

/** Example prompts shown before the buyer types anything. */
export const SOURCING_EXAMPLES = [
  "400 bags of cement delivered to Machakos",
  "Cheapest D12 rebar for a slab in Nakuru",
  "Roofing sheets urgently for a site in Nyeri",
  "Marine plywood and MDF for shopfitting in Kisumu",
  "Bathroom sanitaryware for 45 apartments in Mombasa",
];
