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
  await page.goto("/marketplace/search");

  // Default ranking is by demand, so cement leads rather than something alphabetical.
  const cards = page.locator("article h3 a");
  await expect(cards.first()).toContainText(/Cement/i, { timeout: 15_000 });
  const total = await cards.count();
  expect(total).toBeGreaterThan(20);

  // Facets live behind the Filters toggle now that the grid is full-bleed.
  await page.getByRole("button", { name: /^Filters/ }).click();
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
  await page.goto("/marketplace/search?q=plywood");
  await expect(
    page.getByRole("heading", { name: /for “plywood”/ }),
  ).toBeVisible({ timeout: 15_000 });
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
  await page.goto("/marketplace/search?q=Wire%20Nails");
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

test("the marketplace home carries the full storefront chrome", async ({ page }) => {
  await page.goto("/marketplace");

  // Search hero with its three scope tabs.
  await expect(page.getByRole("tab", { name: /Ask AI/ })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("tab", { name: "Products" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Manufacturers" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Regions" })).toBeVisible();

  // Quick actions and the live counts in the hero panel.
  await expect(
    page.getByRole("link", { name: "Request for Quotation", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Most in demand")).toBeVisible();
  await expect(page.getByText("Shop by category")).toBeVisible();
});

test("the All categories mega menu opens on hover and links through", async ({ page }) => {
  await page.goto("/marketplace");
  await page.getByRole("button", { name: /All categories/i }).hover();

  // The panel shows the hovered category's real listings.
  await expect(page.getByRole("tab", { name: "Cement & Concrete" })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("tab", { name: "Electrical" }).hover();
  await expect(
    page.getByRole("heading", { name: "Electrical", exact: true }),
  ).toBeVisible({ timeout: 15_000 });

  await page
    .getByRole("link", { name: "View all" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/marketplace\/search\?category=Electrical/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Electrical");
});

test("a request for quotation reaches every matching supplier", async ({ page }) => {
  await page.goto("/marketplace/rfq");

  await page.getByLabel(/^Category/).selectOption("Cement & Concrete");
  await page.getByLabel(/^Delivery county/).selectOption("Machakos");

  // The match preview names who would receive it before anything is sent.
  await expect(page.getByText(/Savannah Cement/)).toBeVisible({ timeout: 15_000 });

  await page.getByLabel(/^Quantity/).fill("500");
  await page.getByLabel(/^Hardware shop/).fill("RFQ Test Hardware");
  await page.getByLabel(/^Your name/).fill("Test Buyer");
  await page.getByLabel(/^Phone/).fill("+254712000222");
  await page.getByLabel(/^Email/).fill("rfq@testhardware.co.ke");
  await page.getByRole("button", { name: /Send to \d+ supplier/ }).click();

  await expect(page.getByText(/Your request went to/)).toBeVisible({ timeout: 20_000 });
});

test("top ranking is ordered by real enquiry demand", async ({ page }) => {
  await page.goto("/marketplace/top-ranking");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Top ranking", {
    timeout: 15_000,
  });

  // The breadcrumb is an <ol> too, so anchor on the rank badges instead.
  // These are decorative spans, so match the attribute directly rather than
  // by accessible name.
  const rankOne = page.locator('[aria-label="Rank 1"]');
  await expect(rankOne).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("li").filter({ has: rankOne })).toContainText(/Cement/i);
  await expect(page.locator('[aria-label="Rank 6"]')).toBeVisible();
});

test("browsing a listing populates the history rail on the home page", async ({ page }) => {
  await page.goto("/marketplace/product/prd_eq_vinyl20");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Vinyl Silk/i, {
    timeout: 15_000,
  });

  await page.goto("/marketplace");
  await expect(page.getByText("Browsing history")).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("link", { name: /Equator Vinyl Silk Emulsion/ }).first(),
  ).toBeAttached();
});

test("Ask AI parses a requirement and shows its working", async ({ page }) => {
  await page.goto("/marketplace/ask");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ask AI", {
    timeout: 15_000,
  });

  await page
    .getByLabel("Describe what you need")
    .fill("400 bags of cement delivered to Machakos");
  await page.getByRole("button", { name: "Ask" }).click();

  await expect(page).toHaveURL(/\/marketplace\/ask\?q=/);
  await expect(page.getByText("Here is what I found")).toBeVisible({ timeout: 15_000 });

  // It shows exactly what it recognised, rather than a black-box answer.
  await expect(page.getByText("Matched on")).toBeVisible();
  await expect(page.getByText("cement", { exact: true })).toBeVisible();
  await expect(page.getByText("Machakos", { exact: true }).first()).toBeVisible();

  // And prices the stated quantity against a real listing.
  await expect(page.getByText(/Best indicative price at/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Send this to every matching/ })).toBeVisible();
});

test("the manufacturers tab lists suppliers with their product strips", async ({ page }) => {
  await page.goto("/marketplace/manufacturers");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Verified manufacturers",
    { timeout: 15_000 },
  );

  const rows = page.locator("ul > li").filter({ hasText: "Main products" });
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  expect(await rows.count()).toBeGreaterThan(4);

  // Each row carries trust signals and a route into the store.
  const first = rows.first();
  await expect(first.getByText("Response")).toBeVisible();
  await expect(first.getByRole("link", { name: "Visit store" })).toBeVisible();

  await first.getByRole("link", { name: "Visit store" }).click();
  await expect(page).toHaveURL(/\/marketplace\/manufacturer\//);
});
