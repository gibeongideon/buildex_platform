import { test, expect } from "@playwright/test";
import { COUNTIES } from "../../lib/schemas/common";
import { demandEventsFor } from "../../lib/data/fixtures/demand";
import { seedProducts } from "../../lib/data/fixtures/products";

/*
  The delivery history.

  It stands in for a fulfilment table, and every figure on the Insights screen
  is derived from it — so what matters is not the volume but that it cannot
  contradict the catalogue it claims to describe.
*/

const products = seedProducts();
const events = demandEventsFor(products);
const byId = new Map(products.map((p) => [p.id, p]));

test("nothing ships where the listing says it cannot", () => {
  const stray = events.filter(
    (e) => !byId.get(e.productId)!.availableRegions.includes(e.region),
  );
  expect(stray).toEqual([]);
});

test("a county always belongs to the region it is filed under", () => {
  const region = new Map(COUNTIES.map((c) => [c.name, c.region]));
  const wrong = events.filter((e) => region.get(e.county) !== e.region);
  expect(wrong).toEqual([]);
});

test("value is the product's own band price at that quantity", () => {
  /*
    Revenue has to reconcile with the published price list. If this drifts, the
    Insights screen and the catalogue are quoting two different businesses.
  */
  for (const event of events.slice(0, 40)) {
    const product = byId.get(event.productId)!;
    const band = product.priceBands.find(
      (b) =>
        event.quantity >= b.minQty && (b.maxQty === null || event.quantity <= b.maxQty),
    );
    expect(band, `no band covers ${event.quantity} on ${product.id}`).toBeTruthy();
    expect(event.valueKsh).toBe(Math.round(band!.unitPrice * event.quantity));
  }
});

test("only live listings have a history, and never before they existed", () => {
  const drafted = events.filter((e) => byId.get(e.productId)!.status !== "active");
  expect(drafted).toEqual([]);

  const early = events.filter(
    (e) => new Date(e.at).getTime() < new Date(byId.get(e.productId)!.createdAt).getTime(),
  );
  expect(early).toEqual([]);
});

test("quantities respect the listing's minimum order", () => {
  const belowMoq = events.filter((e) => e.quantity < byId.get(e.productId)!.moq);
  expect(belowMoq).toEqual([]);
});

test("a shop takes delivery in the region it trades from", () => {
  // Buyers were picked at random once, which had a Mombasa shop receiving
  // material in Embu — nonsense the moment anyone reads the repeat-buyer table.
  const byBuyer = new Map<string, Set<string>>();
  for (const event of events) {
    const regions = byBuyer.get(event.buyerName) ?? new Set<string>();
    regions.add(event.region);
    byBuyer.set(event.buyerName, regions);
  }
  for (const [buyer, regions] of byBuyer) {
    expect([...regions], `${buyer} takes delivery in more than one region`).toHaveLength(
      1,
    );
  }
});

test("the same catalogue produces the same history", () => {
  // Charts that reshuffle between renders are worse than no charts.
  expect(JSON.stringify(demandEventsFor(products))).toBe(JSON.stringify(events));
});
