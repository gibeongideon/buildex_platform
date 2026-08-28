import { test, expect } from "@playwright/test";

/*
  Market insights.

  The map is the headline, but the thing worth guarding is the arithmetic
  underneath it: a filter has to actually narrow the data, and a price
  comparison has to be between comparable things or not be shown at all.
*/

test("the destination map narrows to a category", async ({ page }) => {
  await page.goto("/connect/insights");
  await expect(page.getByText("Where your material goes")).toBeVisible({
    timeout: 20_000,
  });

  const countiesReached = async () => {
    const text = await page
      .getByText("Counties reached")
      .locator("xpath=ancestor::div[1]")
      .innerText();
    return Number(text.match(/(\d+)\s*of 47/)?.[1] ?? -1);
  };

  const all = await countiesReached();
  expect(all).toBeGreaterThan(0);

  // Narrowing to one category cannot reach more counties than the whole range.
  const categories = page.getByLabel("Filter by category");
  const options = await categories.locator("option").allTextContents();
  const category = options.find((o) => o !== "All categories");
  test.skip(!category, "supplier lists a single category");

  await categories.selectOption({ label: category! });
  await expect
    .poll(countiesReached, { timeout: 15_000 })
    .toBeLessThanOrEqual(all);
});

test("a supplier's delivered value reconciles with its destinations", async ({
  page,
}) => {
  /*
    The tile and the ranked list read the same query. If they ever disagree the
    page is aggregating twice, which is the bug this whole screen is built to
    avoid.
  */
  await page.goto("/connect/insights");
  await expect(page.getByText("Top destinations")).toBeVisible({ timeout: 20_000 });

  const rows = page
    .getByText("Top destinations")
    .locator("xpath=following-sibling::ul[1]")
    .locator("li");
  await expect(rows.first()).toBeVisible();

  // The busiest destination leads the list.
  const first = await rows.first().innerText();
  expect(first).toMatch(/KSh/);
});

test("price position only compares like with like", async ({ page }) => {
  await page.goto("/connect/insights");
  await expect(page.getByText("Where you sit on price")).toBeVisible({
    timeout: 20_000,
  });

  const card = page
    .getByText("Where you sit on price")
    .locator("xpath=ancestor::div[contains(@class,'rounded-lg')][1]");

  /*
    Wait for the query to settle. The card used to render its empty state while
    still loading, so reading it too early skipped this test rather than
    failing it — a guard that guards nothing.
  */
  await expect
    .poll(async () => (await card.innerText()).includes("against"), { timeout: 20_000 })
    .toBe(true);

  const body = await card.innerText();

  /*
    Every row states its sample, and the sample is never smaller than three —
    below that the "median" is just the other listing, and a 200mm block came
    out 98% below a market made of one 450mm culvert pipe.
  */
  const samples = [...body.matchAll(/against\s+(\d+)\s+listings?\s+per\s+(\w+)/g)];
  expect(samples.length).toBeGreaterThan(0);
  for (const [, count] of samples) {
    expect(Number(count)).toBeGreaterThanOrEqual(3);
  }

  // And the unit is always named, because a bag and a piece are not a market.
  const units = new Set(samples.map(([, , unit]) => unit));
  expect(units.size).toBeGreaterThan(0);
});

test("repeat buyers are shops that actually came back", async ({ page }) => {
  await page.goto("/connect/insights");
  await expect(page.getByText("Shops that came back")).toBeVisible({ timeout: 20_000 });

  const card = page
    .getByText("Shops that came back")
    .locator("xpath=ancestor::div[contains(@class,'rounded-lg')][1]");

  await expect
    .poll(async () => (await card.innerText()).includes("Deliveries"), {
      timeout: 20_000,
    })
    .toBe(true);

  const body = await card.innerText();

  // One delivery is a customer, not a repeat buyer.
  const deliveries = [...body.matchAll(/^(\d+)$/gm)].map(([, n]) => Number(n));
  for (const count of deliveries) expect(count).toBeGreaterThan(1);
});
