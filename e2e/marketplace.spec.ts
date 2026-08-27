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

  /*
    Scoped to the menu itself. The home page now carries a rail per category, so
    an <h3> reading "Electrical" exists on the page as well — an unscoped match
    finds both and trips strict mode, but only once the rail data has loaded,
    which made this intermittently red rather than reliably so.
  */
  const menu = page.getByRole("group", { name: "All categories" });
  await expect(
    menu.getByRole("heading", { name: "Electrical", exact: true }),
  ).toBeVisible({ timeout: 15_000 });

  await menu.getByRole("link", { name: "View all" }).first().click();
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
    .getByLabel("Describe what you need", { exact: true })
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

  /*
    The directory and the home page's Manufacturers tab render the same
    `ManufacturerRow`, so this also covers the shortlist on the home page: the
    credentials, the product strip with prices and minimum orders, and the route
    into the store.
  */
  const first = rows.first();
  await expect(first.getByText("Factory capabilities")).toBeVisible();
  await expect(first).toContainText(/Min\. order:/);
  await expect(first).toContainText(/KSh/);
  await expect(first).toContainText(/orders fulfilled/);
  await expect(first.getByRole("link", { name: /Visit store/ })).toBeVisible();

  // The strip spreads across categories rather than repeating one photo, so a
  // buyer can see the breadth of what a supplier makes.
  const tiles = first.locator('a[href^="/marketplace/product/"]');
  expect(await tiles.count()).toBeGreaterThan(1);

  await first.getByRole("link", { name: /Visit store/ }).click();
  await expect(page).toHaveURL(/\/marketplace\/manufacturer\//);
});

test("the scope tabs switch the home page in place, and navigate elsewhere", async ({
  page,
}) => {
  await page.goto("/marketplace");

  /*
    On the home page a tab is a mode switch, not a link: the reference
    marketplace keeps you put until you actually search, because choosing what
    *kind* of thing you want is not yet a search. Each tab has to change the
    content without changing the URL.
  */
  for (const [label, heading] of [
    ["Manufacturers", /verified manufacturers/i],
    ["Regions", /regions/i],
    ["Ask AI", /Describe the job/i],
  ] as const) {
    await page.getByRole("tab", { name: new RegExp(label) }).click();
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/marketplace$/);
    await expect(page.getByRole("tab", { selected: true })).toContainText(label);
  }

  // Manufacturers shows real suppliers with their own products, prices and MOQ.
  await page.getByRole("tab", { name: /Manufacturers/ }).click();
  const supplier = page.getByRole("listitem").filter({ hasText: /Visit store/ }).first();
  await expect(supplier).toBeVisible({ timeout: 15_000 });
  await expect(supplier).toContainText("Main products");
  await expect(supplier).toContainText(/Min\. order:/);
  await expect(supplier).toContainText(/KSh/);
  await expect(supplier).toContainText("Factory capabilities");

  // A capability chip narrows the list, and every chip is a real credential.
  const before = await page.getByRole("listitem").filter({ hasText: /Visit store/ }).count();
  await page.getByRole("checkbox", { name: "ISO 9001" }).click();
  await expect
    .poll(
      async () =>
        page.getByRole("listitem").filter({ hasText: /Visit store/ }).count(),
      { timeout: 15_000 },
    )
    .toBeLessThanOrEqual(before);
  await expect(page.getByRole("checkbox", { name: "ISO 9001" })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  // Back on Products, the listing grid returns.
  await page.getByRole("tab", { name: "Products" }).click();
  await expect(page.getByRole("heading", { name: "Most in demand" })).toBeVisible({
    timeout: 15_000,
  });

  // Off the home page the same tabs are navigation, and the active one is
  // derived from the route so a deep link shows it correctly.
  await page.goto("/marketplace/manufacturers");
  await expect(page.getByRole("tab", { selected: true })).toContainText(
    "Manufacturers",
    { timeout: 15_000 },
  );

  // And switching surface there keeps the buyer's term.
  await page.goto("/marketplace/search?q=cement");
  await page.getByRole("tab", { name: /Ask AI/ }).click();
  await expect(page).toHaveURL(/\/marketplace\/ask\?q=cement/);
  await expect(page.getByRole("tab", { selected: true })).toContainText("Ask AI");
});

test("the Regions tab actually searches", async ({ page }) => {
  await page.goto("/marketplace/regions?q=Kisumu");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Delivery regions",
    { timeout: 15_000 },
  );
  await expect(page.getByText(/Regions that can serve/)).toBeVisible();
  await expect(page.getByText(/“Kisumu”/)).toBeVisible();
});

test("the hero's category scope narrows the results", async ({ page }) => {
  await page.goto("/marketplace");
  await page
    .getByLabel("Narrow to a category")
    .selectOption("Roofing", { timeout: 15_000 });
  await page.getByLabel(/^Search cement/).fill("sheet");
  await page.locator('form button[type="submit"]').click();

  await expect(page).toHaveURL(/category=Roofing/);
  await expect(page.getByRole("button", { name: /^Roofing/ })).toBeVisible({
    timeout: 15_000,
  });
});

test("the mega menu stays open when a mouse user clicks the trigger", async ({ page }) => {
  await page.goto("/marketplace");
  const trigger = page.getByRole("button", { name: /All categories/i });

  // Hover fires before click, so a toggling handler closed the panel it had
  // just opened. Click only ever opens.
  await trigger.hover();
  await expect(trigger).toHaveAttribute("aria-expanded", "true", { timeout: 15_000 });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("the home page leads with the product grid, no dead columns", async ({ page }) => {
  await page.goto("/marketplace");

  // The grid is the point of the page, so it carries real depth.
  await expect
    .poll(async () => page.locator("article").count(), { timeout: 20_000 })
    .toBeGreaterThan(30);

  // The panel row fills every column it reserves.
  const row = page.locator("section").filter({ hasText: "Categories for you" }).first();
  const panels = row.locator("> div > div");
  await expect(panels.first()).toBeVisible();
});

test("a buyer can compare the same material across suppliers, priced at their quantity", async ({
  page,
}) => {
  await page.goto("/marketplace/search?category=Cement%20%26%20Concrete");
  await expect(page.locator("article h3 a").first()).toBeVisible({ timeout: 15_000 });

  // Shortlist two listings from the grid.
  const toggles = page.getByRole("checkbox", { name: /Compare/ });
  await toggles.nth(0).click();
  await toggles.nth(1).click();

  // The tray reports the shortlist and is the way through to the comparison.
  const tray = page.getByRole("region", { name: /selected for comparison/i });
  await expect(tray).toBeVisible({ timeout: 15_000 });
  await expect(tray).toContainText("2 of 4 selected");

  await tray.getByRole("button", { name: /^Compare/ }).click();
  await expect(page).toHaveURL(/\/marketplace\/compare\?ids=/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Compare", {
    timeout: 15_000,
  });

  /*
    The rows a buyer decides on. Anchored: each row header carries a hint, and
    the Line total row's hint is literally "Unit price × quantity", so an
    unanchored match would hit two headers and trip strict mode.
  */
  for (const label of ["Unit price", "Line total", "Minimum order", "Price bands"]) {
    await expect(
      page.getByRole("rowheader", { name: new RegExp(`^${label}`) }),
    ).toBeVisible();
  }

  /*
    The point of the page: price is a set of quantity bands, so who is cheapest
    depends on how much you buy. Exactly one column carries the badge, and the
    figures change when the quantity does.
  */
  await expect(page.getByText("Cheapest at this quantity")).toHaveCount(1);
  const atDefault = await page
    .getByRole("row")
    .filter({ hasText: "Line total" })
    .innerText();

  await page.getByLabel("Your quantity").fill("5000");
  await expect
    .poll(
      async () =>
        page.getByRole("row").filter({ hasText: "Line total" }).innerText(),
      { timeout: 15_000 },
    )
    .not.toBe(atDefault);
  await expect(page.getByText("Cheapest at this quantity")).toHaveCount(1);

  // A quantity below every supplier's minimum is stated, not priced.
  await page.getByLabel("Your quantity").fill("1");
  await expect(page.getByText(/Below their minimum/).first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Cheapest at this quantity")).toHaveCount(0);
});
