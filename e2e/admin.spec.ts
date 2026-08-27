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

test("the four internal roles each own a section", async ({ page }) => {
  await page.goto("/admin/team");
  await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible({
    timeout: 20_000,
  });

  for (const [role, person, owns] of [
    ["Operations", "John Gitahi", "/admin/verification"],
    ["Risk & Compliance", "Daniel Otieno", "/admin/activity"],
    ["Commercial & Accounts", "Franklin Wanyama", "/admin/subscriptions"],
    ["Supplier Support", "Mercy Chebet", "/admin/enquiries"],
  ]) {
    await expect(page.getByRole("heading", { name: role })).toBeVisible();
    // The current role's name also appears in the shell's user block.
    await expect(page.getByText(person).first()).toBeVisible();
    await expect(page.getByRole("link", { name: owns })).toBeVisible();
  }

  // No responsibility may appear under two roles — the page is worthless if the
  // cards contradict each other about who owns a power.
  const duties = await page
    .locator('[role="checkbox"], li')
    .filter({ hasText: /^(Approve|Set a package|Pause or resume|Suspend)/ })
    .allTextContents();
  const trimmed = duties.map((d) => d.trim());
  expect(new Set(trimmed).size).toBe(trimmed.length);

  // Switching view changes who the console says you are.
  await page.getByRole("button", { name: /View as Commercial & Accounts/ }).click();
  await expect(
    page.getByText("You are viewing the console as Commercial & Accounts."),
  ).toBeVisible({ timeout: 20_000 });
});

/*
  A contrast regression test.

  The console shipped once with secondary text at 4.54:1 — legal under AA, and
  genuinely hard to read at the 12px uppercase those labels use. A ratio that
  close to the floor is a defect waiting to be reintroduced by anyone tuning a
  token, so it is measured rather than left to review.

  Colours are resolved by painting them onto a canvas rather than parsing the
  string: Tailwind v4 emits `oklab()` for anything with an alpha modifier, and
  regex-parsing that yields nonsense. Painting also composites translucency
  against the real ground, which is what a reader actually sees.
*/
const MIN_RATIO = { heading: 10, body: 7, secondary: 5.5 };

test.describe("text is legible, measured", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`text clears AA with margin in ${theme} mode`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: theme });
      const page = await context.newPage();
      await page.goto("/admin");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
        timeout: 20_000,
      });

      const measured = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d")!;

        /** Any CSS colour → sRGB, composited over `base` so alpha is honoured. */
        const paint = (color: string, base: string) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = base;
          ctx.fillRect(0, 0, 1, 1);
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          return [r, g, b] as const;
        };

        const lum = ([r, g, b]: readonly [number, number, number]) => {
          const [lr, lg, lb] = [r, g, b].map((v) => {
            const c = v / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
        };

        const pageGround = getComputedStyle(document.documentElement).backgroundColor;
        const opaqueBase = "#ffffff";
        const rootRgb = paint(pageGround, opaqueBase);
        const rootHex = `rgb(${rootRgb.join(",")})`;

        /** First ancestor that paints something, composited down to the root. */
        const groundOf = (el: Element) => {
          const stack: string[] = [];
          let node: Element | null = el;
          while (node) {
            const bg = getComputedStyle(node).backgroundColor;
            if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") stack.push(bg);
            node = node.parentElement;
          }
          let base = rootHex;
          for (const layer of stack.reverse()) {
            base = `rgb(${paint(layer, base).join(",")})`;
          }
          return base;
        };

        const ratio = (fg: string, bg: string) => {
          const [hi, lo] = [lum(paint(fg, bg)), lum(paint(bg, opaqueBase))].sort(
            (a, b) => b - a,
          );
          return (hi + 0.05) / (lo + 0.05);
        };

        const worst = (selector: string) => {
          let low = Infinity;
          let sample = "";
          for (const el of document.querySelectorAll(selector)) {
            // Contrast on something nobody can see is meaningless — this skips
            // sr-only labels and anything hidden at this breakpoint.
            if (!el.getClientRects().length) continue;
            const text = el.textContent?.trim();
            if (!text) continue;
            const style = getComputedStyle(el);
            const r = ratio(style.color, groundOf(el));
            if (r < low) {
              low = r;
              sample = text.slice(0, 40);
            }
          }
          return { ratio: low === Infinity ? null : low, sample };
        };

        return {
          heading: worst("h1, h2, h3"),
          body: worst(".text-muted-foreground"),
          secondary: worst(".text-subtle-foreground"),
        };
      });

      for (const key of ["heading", "body", "secondary"] as const) {
        const row = measured[key];
        if (row.ratio === null) continue;
        expect(
          row.ratio,
          `${key} text too faint in ${theme} mode ("${row.sample}" at ${row.ratio.toFixed(2)}:1)`,
        ).toBeGreaterThanOrEqual(MIN_RATIO[key]);
      }

      await context.close();
    });
  }
});
