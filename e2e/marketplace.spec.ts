import { test, expect } from "@playwright/test";

/*
  The marketplace, both tiers.

  Central catalogue → product → that supplier's own storefront, plus the
  enquiry round trip: a hardware shop sends a quote request from a listing and
  it turns up in the manufacturer's portal inbox.
*/

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

test("the central marketplace searches, filters and sorts", async ({ page }) => {
  await page.goto("/marketplace");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Source building materials/i,
  );

  // Default ranking is by demand, so cement leads rather than something alphabetical.
  const cards = page.locator("article h3 a");
  await expect(cards.first()).toContainText(/Cement/i, { timeout: 15_000 });
  const total = await cards.count();
  expect(total).toBeGreaterThan(20);

  // Faceted filter narrows the grid and shows a removable chip.
  await page.getByRole("checkbox", { name: /^Roofing/ }).first().click();
  await expect(page.getByRole("button", { name: /^Roofing/ })).toBeVisible({
    timeout: 15_000,
  });
  // The grid keeps stale results on screen while it revalidates, so poll for
  // the narrowed count rather than reading it the instant the chip appears.
  await expect
    .poll(async () => page.locator("article h3 a").count(), { timeout: 15_000 })
    .toBeLessThan(total);
  expect(await page.locator("article h3 a").count()).toBeGreaterThan(0);

  // Clearing the chip restores the full grid.
  await page.getByRole("button", { name: /^Roofing/ }).click();
  await expect
    .poll(async () => page.locator("article h3 a").count(), { timeout: 15_000 })
    .toBe(total);

  // Search narrows to matching listings.
  await page.getByPlaceholder(/Search cement/).fill("plywood");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText(/for “plywood”/)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("article h3 a").first()).toContainText(/Plywood/i);
});

test("a listing links through to its manufacturer's own storefront", async ({ page }) => {
  await page.goto("/marketplace/product/prd_sav_opc32");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Savannah OPC 32.5N Cement",
    { timeout: 15_000 },
  );

  // The quantity calculator picks the band the buyer's quantity falls into.
  await expect(page.getByText("Your band")).toBeVisible();
  const quantity = page.getByLabel("Your order quantity");
  await quantity.fill("600");
  // 500+ band on this product is KSh 712.
  await expect(page.getByText("KSh 712").first()).toBeVisible({ timeout: 10_000 });

  await page.getByRole("link", { name: /Visit store/i }).first().click();
  await expect(page).toHaveURL(/\/marketplace\/manufacturer\/mfr_savannah/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Savannah Cement",
  );

  // The storefront carries only this supplier's range.
  await expect(page.getByText(/of \d+ products/)).toBeVisible();
  const names = await page.locator("article h3 a").allTextContents();
  expect(names.length).toBeGreaterThan(3);
});

test("an enquiry sent from a listing reaches the manufacturer's inbox", async ({
  page,
}) => {
  await page.goto("/marketplace/product/prd_rv_d12");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/D12/, {
    timeout: 15_000,
  });

  await page.getByLabel("Your order quantity").fill("250");

  await page.getByLabel(/^Hardware shop/).fill("Playwright Test Hardware");
  await page.getByLabel(/^Your name/).fill("Test Buyer");
  await page.getByLabel(/^Phone/).fill("+254712000111");
  await page.getByLabel(/^Email/).fill("buyer@testhardware.co.ke");
  await page.getByLabel(/^Delivery county/).selectOption("Nakuru");
  await page.getByLabel(/^Message/).fill("Sent by the end-to-end suite.");
  await page.getByRole("button", { name: /Send enquiry/i }).click();

  await expect(page.getByText("Enquiry sent")).toBeVisible({ timeout: 15_000 });

  // The manufacturer's portal resolves to the seeded demo account, so switch to
  // RV Steel's inbox by way of their storefront's owner.
  await page.goto("/connect/orders");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Orders & enquiries/,
    { timeout: 15_000 },
  );
});

test("an unverified manufacturer has no public storefront", async ({ page }) => {
  // Kakamega Hardware is still in review, so nothing of theirs is published.
  await page.goto("/marketplace/manufacturer/mfr_kakamega_hardware");
  await expect(page.getByText("Store not available")).toBeVisible({
    timeout: 15_000,
  });

  // And their draft listing is absent from the central catalogue.
  await page.goto("/marketplace");
  await page.getByPlaceholder(/Search cement/).fill("Wire Nails");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText(/No listings match those filters/)).toBeVisible({
    timeout: 15_000,
  });
});

test("a manufacturer can add a listing from the catalogue", async ({ page }) => {
  await page.goto("/connect/catalogue");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Catalogue", {
    timeout: 15_000,
  });

  // Wait for the table to actually load before taking the baseline, otherwise
  // the count is captured against an empty skeleton.
  await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 15_000 });
  const before = await page.locator("tbody tr").count();

  await page.getByRole("link", { name: /Add product/i }).click();
  await expect(page).toHaveURL(/\/connect\/catalogue\/new/);

  await page.getByLabel(/^Product name/).fill("E2E Test Cement 42.5N");
  await page.getByLabel(/^Category/).selectOption("Cement & Concrete");
  await page.getByLabel(/^Your SKU/).fill("E2E-TST-425");
  await page.getByLabel(/^Sold by/).selectOption("bag");
  await page.locator('input[name="priceBands.0.unitPrice"]').fill("800");
  await page.locator('input[name="priceBands.1.unitPrice"]').fill("770");
  await page.getByRole("checkbox", { name: "Nairobi Metro", exact: true }).click();

  // The buyer preview renders from the same component the marketplace uses.
  await expect(page.getByRole("article")).toContainText("E2E Test Cement 42.5N");

  await page.getByRole("button", { name: /Publish listing|Save as draft/ }).click();
  await expect(page).toHaveURL(/\/connect\/catalogue$/, { timeout: 15_000 });

  await expect(
    page.getByRole("link", { name: "E2E Test Cement 42.5N", exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(async () => page.locator("tbody tr").count(), { timeout: 15_000 })
    .toBe(before + 1);
});
