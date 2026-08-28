import { test, expect } from "@playwright/test";
import {
  importTemplateCsv,
  parseDelimited,
  parsePriceBands,
  parseProductImport,
} from "../../lib/rules/product-import";

/*
  The import parser, tested directly.

  Everything here is a shape a real spreadsheet emits. Driving these through the
  browser would be slower and would not make the failures any clearer, so they
  run against the module — the page's own behaviour is covered in
  catalogue-import.spec.ts.
*/

test("it reads what spreadsheets actually write", () => {
  // BOM, CRLF, a quoted field holding the delimiter, and a doubled quote.
  expect(parseDelimited('﻿a,b\r\n"x, y","he said ""hi"""\r\n')).toEqual([
    ["a", "b"],
    ["x, y", 'he said "hi"'],
  ]);

  // Tab-separated, which is what a paste out of Excel gives.
  expect(parseDelimited("a\tb\n1\t2")).toEqual([
    ["a", "b"],
    ["1", "2"],
  ]);

  // Trailing blank lines are an artefact of every editor, not a row.
  expect(parseDelimited("a,b\n1,2\n\n")).toHaveLength(2);
});

test("price bands read the way a trade price list is written", () => {
  expect(parsePriceBands("1-99:750 | 100-499:720 | 500+:690")).toEqual([
    { minQty: 1, maxQty: 99, unitPrice: 750 },
    { minQty: 100, maxQty: 499, unitPrice: 720 },
    { minQty: 500, maxQty: null, unitPrice: 690 },
  ]);

  // Thousands separators survive the trip.
  expect(parsePriceBands("1,000+:1,250")).toEqual([
    { minQty: 1000, maxQty: null, unitPrice: 1250 },
  ]);

  expect(typeof parsePriceBands("1..99=750")).toBe("string");
});

test("the template imports cleanly — it is the first thing anyone tries", () => {
  const result = parseProductImport(importTemplateCsv());
  expect(result.errors).toEqual([]);
  expect(result.drafts).toHaveLength(2);
  expect(result.drafts[0].isMainProduct).toBe(true);
  expect(result.drafts[0].priceBands).toHaveLength(3);
});

test("a bad row is reported by line and column without stopping the good ones", () => {
  const result = parseProductImport(
    importTemplateCsv() +
      "Bad Category,Nope,X1,,bag,,1-9:100,1,2,Nairobi Metro,no\n" +
      "Gappy Bands,Roofing,X2,,sheet,,1-9:100 | 20-30:90,1,2,Nairobi Metro,no\n",
  );

  expect(result.drafts).toHaveLength(2);
  expect(result.errors).toHaveLength(2);

  expect(result.errors[0]).toMatchObject({ line: 4, column: "category" });
  expect(result.errors[0].message).toContain('"Nope" is not recognised');

  /*
    The price-band tiling rule reaches the importer through the same schema the
    form uses: a band starting at 20 when the one before ends at 9 leaves 10–19
    unpriced.
  */
  expect(result.errors[1]).toMatchObject({ line: 5, column: "price bands" });
  expect(result.errors[1].message).toContain("Should start at 10");
});

test("a SKU repeated inside one file is caught", () => {
  const result = parseProductImport(
    importTemplateCsv() + "Copy,Roofing,ACME-D12,,sheet,,1-9:100,1,2,Nairobi Metro,no\n",
  );
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0]).toMatchObject({ line: 4, column: "sku" });
});

test("a missing header names what it needs", () => {
  const result = parseProductImport("name,category\nThing,Roofing\n");
  expect(result.drafts).toEqual([]);
  expect(result.errors[0].message).toContain("sku");
  expect(result.errors[0].message).toContain("price bands");
});
