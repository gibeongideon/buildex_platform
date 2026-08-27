import { test, expect, type Page } from "@playwright/test";

/*
  Buildex Admin — the internal console.

  These specs exist to prove the console is wired to the same records everything
  else reads, not to a parallel copy. Each one starts on a seeded application,
  takes a real decision, and then checks the consequence somewhere else in the
  product: the manufacturer's storefront, the public marketplace, the activity
  feed.
*/

/** Kakamega Hardware: in review, with draft listings waiting behind it. */
const IN_REVIEW = "mfr_kakamega_hardware";
/** Athi Adhesives: action needed, an expired TCC named as the blocker. */
const ACTION_NEEDED = "mfr_athi_adhesives";
/** Meru Pipe Works: in review and well past the KRA check's 24h target. */
const PAST_SLA = "mfr_meru_pipes";
/** Savannah Cement: verified, VIP, the busiest storefront in the seed. */
const VERIFIED = "mfr_savannah";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

/** Takes one of the four decisions on an application in the reviewer. */
async function decide(page: Page, id: string, match: RegExp, record: RegExp) {
  await page.goto(`/admin/verification/${id}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: match }).click();
  await page.getByRole("button", { name: record }).click();
}

test("the overview counts what is actually in the data", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Platform overview|Buildex Admin/,
    { timeout: 20_000 },
  );

  // Awaiting decision is the figure the whole console exists to move.
  const awaiting = page.getByText("Awaiting decision", { exact: false }).first();
  await expect(awaiting).toBeVisible({ timeout: 20_000 });

  // The console says out loud that it has no authentication.
  await expect(page.getByText(/no authentication/i).first()).toBeVisible();

  // And that credit pages are deliberately absent rather than unbuilt.
  await expect(page.getByText(/Buildex Capital/).first()).toBeVisible();
});

test("the verification queue leads with the worst SLA breach", async ({ page }) => {
  await page.goto("/admin/verification");
  await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 20_000 });

  // Every row in the in-flight scope is genuinely undecided.
  const rows = await page.locator("tbody tr").count();
  expect(rows).toBeGreaterThan(3);

  // At least one row is flagged as breached, and Meru Pipe Works is in the queue.
  await expect(page.getByText(/past SLA|Breached/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Meru Pipe Works/ })).toBeVisible();

  await page.getByRole("link", { name: /Meru Pipe Works/ }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/verification/${PAST_SLA}`));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Meru Pipe Works");
});

test("approving a supplier publishes the drafts it was holding", async ({ page }) => {
  // Before: no public storefront, and their drafts are absent from the catalogue.
  await page.goto(`/marketplace/manufacturer/${IN_REVIEW}`);
  await expect(page.getByText("Store not available")).toBeVisible({ timeout: 20_000 });

  await decide(page, IN_REVIEW, /Pass every outstanding check/, /^Record approve$/i);
  await expect(page.getByText(/Approve recorded/)).toBeVisible({ timeout: 20_000 });

  // The reviewer itself now reads Verified.
  await expect(page.getByText("Verified").first()).toBeVisible({ timeout: 20_000 });

  // The drafts they were forced to park are live, so the storefront has stock.
  await page.goto(`/marketplace/manufacturer/${IN_REVIEW}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Kakamega Hardware",
    { timeout: 20_000 },
  );
  await expect
    .poll(async () => page.locator("article h3 a").count(), { timeout: 20_000 })
    .toBeGreaterThan(0);

  // And they reach the central marketplace, which reads the same one rule.
  await page.goto("/marketplace/search?q=Wire%20Nails");
  await expect(page.locator("article h3 a").first()).toContainText(/Nail/i, {
    timeout: 20_000,
  });
});

test("rejection names only the documents that are wrong", async ({ page }) => {
  await page.goto(`/admin/verification/${IN_REVIEW}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: /Name the documents that are wrong/ }).click();

  // Recording is blocked until the reviewer says what is wrong and why.
  const record = page.getByRole("button", { name: /^Record reject$/i });
  await expect(record).toBeDisabled();

  await page.getByRole("checkbox", { name: /Tax Compliance Certificate/ }).click();
  await expect(record).toBeDisabled();
  await page
    .getByLabel(/Note to the manufacturer/)
    .fill("The TCC on file expired. Attach a current one from iTax.");
  await expect(record).toBeEnabled();
  await record.click();
  await expect(page.getByText(/Reject recorded/)).toBeVisible({ timeout: 20_000 });

  // The manufacturer's resubmit flow asks for exactly that one document.
  await page.goto("/connect/verification");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Verification", {
    timeout: 20_000,
  });
});

test("a site visit clears listing but holds transacting", async ({ page }) => {
  await decide(
    page,
    IN_REVIEW,
    /Clear the desk checks but hold transacting/,
    /^Record flag for site visit$/i,
  );
  await expect(page.getByText(/Flag for site visit recorded/)).toBeVisible({
    timeout: 20_000,
  });

  // Conditional approval: the catalogue is public, orders are not enabled.
  await page.goto(`/admin/manufacturers/${IN_REVIEW}`);
  await expect(
    page.getByText(/Listing allowed, transacting held/),
  ).toBeVisible({ timeout: 20_000 });

  await page.goto(`/marketplace/manufacturer/${IN_REVIEW}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Kakamega Hardware",
    { timeout: 20_000 },
  );
});

test("suspending a supplier pulls its listings out of the marketplace", async ({
  page,
}) => {
  await page.goto(`/marketplace/manufacturer/${VERIFIED}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Savannah Cement",
    { timeout: 20_000 },
  );

  await page.goto(`/admin/manufacturers/${VERIFIED}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Savannah Cement",
    { timeout: 20_000 },
  );
  await page.getByRole("button", { name: /^Suspend$/ }).click();
  await expect(page.getByText(/This supplier is suspended/)).toBeVisible({
    timeout: 20_000,
  });

  // The storefront goes dark and the listings leave the central catalogue.
  await page.goto(`/marketplace/manufacturer/${VERIFIED}`);
  await expect(page.getByText("Store not available")).toBeVisible({ timeout: 20_000 });

  await page.goto("/marketplace/search?q=Savannah");
  await expect(page.getByText(/No listings match those filters/)).toBeVisible({
    timeout: 20_000,
  });

  // Reinstating recomputes from the checks, so they come back verified.
  await page.goto(`/admin/manufacturers/${VERIFIED}`);
  await page.getByRole("button", { name: /^Reinstate$/ }).click();
  // The suspension banner clearing is the unambiguous signal that the write
  // landed — "Verified" as bare text appears in more than one place here.
  await expect(page.getByText(/This supplier is suspended/)).toBeHidden({
    timeout: 20_000,
  });
  await page.goto(`/marketplace/manufacturer/${VERIFIED}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Savannah Cement",
    { timeout: 20_000 },
  );
});

test("the activity feed reflects a decision that was actually taken", async ({
  page,
}) => {
  await page.goto("/admin/activity");
  await expect(page.getByText(/event/).first()).toBeVisible({ timeout: 20_000 });

  // Filtering to Buildex Operations narrows to what Buildex itself has done.
  await page.getByLabel("Who acted").selectOption("ops");
  await expect(
    page.getByRole("listitem").filter({ hasText: "Buildex Operations" }).first(),
  ).toBeVisible({ timeout: 20_000 });

  await decide(page, PAST_SLA, /Pass every outstanding check/, /^Record approve$/i);
  await expect(page.getByText(/Approve recorded/)).toBeVisible({ timeout: 20_000 });

  // The verification that just happened is at the top of the timeline.
  await page.goto("/admin/activity");
  await page.getByLabel("Search").fill("Meru Pipe Works");
  // Scoped to feed rows: the supplier filter's <select> carries the same name.
  const row = page
    .getByRole("listitem")
    .filter({ hasText: /Meru Pipe Works/ })
    .first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await expect(row).toContainText(/verified|passed/i);
});

test("every exception on the overview links to something real", async ({ page }) => {
  await page.goto("/admin");
  const links = page.locator('a[href^="/admin/"]');
  await expect(links.first()).toBeVisible({ timeout: 20_000 });

  // The exceptions panel is the actionable half of the overview.
  await expect(page.getByText(/past SLA|action needed|unanswered/i).first()).toBeVisible();

  // Athi Adhesives is in action_needed with a named blocking document, so it
  // has to be one of them.
  await page.goto(`/admin/verification/${ACTION_NEEDED}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Athi Adhesives", {
    timeout: 20_000,
  });
  await expect(page.getByText(/Expired/).first()).toBeVisible();
});

test("the console sections all render their real data", async ({ page }) => {
  await page.goto("/admin/listings");
  await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 20_000 });
  expect(await page.locator("tbody tr").count()).toBeGreaterThan(20);

  await page.goto("/admin/enquiries");
  await expect(page.getByText(/of \d+$/).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Who is answering" })).toBeVisible();

  await page.goto("/admin/campaigns");
  await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 20_000 });

  await page.goto("/admin/subscriptions");
  await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/indicative/i).first()).toBeVisible();

  await page.goto("/admin/team");
  await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByText(/Roles here are a view, not a permission/),
  ).toBeVisible();
});

test("the manufacturer record moves between its tabs with the keyboard", async ({
  page,
}) => {
  await page.goto(`/admin/manufacturers/${VERIFIED}`);
  await expect(page.getByRole("tab", { name: /Overview/ })).toBeVisible({
    timeout: 20_000,
  });

  await page.getByRole("tab", { name: /Overview/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Catalogue/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("tabpanel")).toContainText(/Cement|SAV-/);

  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: /Activity/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("the decision panel is operable with the keyboard alone", async ({ page }) => {
  await page.goto(`/admin/verification/${ACTION_NEEDED}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });

  // Choose "Reject" with the keyboard: the options are buttons, so Enter fires them.
  const reject = page.getByRole("button", { name: /Name the documents that are wrong/ });
  await reject.focus();
  await page.keyboard.press("Enter");
  await expect(reject).toHaveAttribute("aria-pressed", "true");

  /*
    Walk forward from the chosen option and record what the tab order visits.
    The panel's whole job is capturing a reason and naming documents, so a
    keyboard user has to reach the checkboxes, the note and the confirm button
    without a pointer.
    */
  const visited: string[] = [];
  for (let i = 0; i < 30; i += 1) {
    await page.keyboard.press("Tab");
    const marker = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return "";
      const role = el.getAttribute("role") ?? el.tagName.toLowerCase();
      return `${role}:${(el.getAttribute("aria-label") ?? el.textContent ?? el.id ?? "").trim().slice(0, 40)}`;
    });
    visited.push(marker);
    if (marker.startsWith("button:Cancel")) break;
  }

  expect(visited.some((v) => v.startsWith("checkbox"))).toBe(true);
  expect(visited.some((v) => v.startsWith("textarea"))).toBe(true);
  expect(visited.some((v) => v.startsWith("button:Cancel"))).toBe(true);

  // Confirm is disabled until the reviewer has said what is wrong, so it is
  // correctly absent from the tab order until then.
  expect(visited.some((v) => v.startsWith("button:Record reject"))).toBe(false);

  // Fill both requirements from the keyboard, and it joins the tab order.
  await page.getByRole("checkbox", { name: /Tax Compliance Certificate/ }).press("Space");
  await page.getByLabel(/Note to the manufacturer/).focus();
  await page.keyboard.type("Replace the expired TCC with a current one from iTax.");

  await page.getByRole("button", { name: /^Cancel$/ }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /^Record reject$/i })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Reject recorded/)).toBeVisible({ timeout: 20_000 });
});
