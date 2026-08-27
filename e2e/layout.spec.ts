import { test, expect } from "@playwright/test";

/*
  Nothing pushes the page sideways.

  A horizontal scrollbar on the document is the one layout failure that is both
  easy to introduce — a table, a wide toolbar, a long unbroken string — and easy
  to miss, because it only shows at the widths you did not open. Wide content is
  supposed to scroll inside its own container; the page itself never does.

  This ran as a throwaway script twice before. It is a spec now because the
  shared FilterBar and DataTable put the same markup on twenty-odd screens, so a
  regression in either is a regression everywhere at once.

  Both themes, because dark mode changes borders and shadows, and those have
  pushed layouts before.
*/

const PATHS = [
  "/",
  "/manufacturers",
  "/marketplace",
  "/marketplace/search",
  "/marketplace/manufacturers",
  "/marketplace/regions",
  "/marketplace/top-ranking",
  "/marketplace/compare",
  "/marketplace/ask",
  "/marketplace/rfq",
  "/marketplace/manufacturer/mfr_savannah_cement",
  "/admin",
  "/admin/verification",
  "/admin/manufacturers",
  "/admin/listings",
  "/admin/enquiries",
  "/admin/campaigns",
  "/admin/subscriptions",
  "/admin/activity",
  "/admin/suppliers",
  "/admin/vendor-bills",
  "/connect/dashboard",
  "/connect/verification",
  "/connect/catalogue",
  "/connect/orders",
  "/connect/campaigns",
  "/connect/insights",
  "/connect/subscription",
  "/connect/settings",
];

/** Small phone, tablet, small laptop, desktop. */
const WIDTHS = [360, 768, 1024, 1440];

for (const theme of ["light", "dark"] as const) {
  for (const width of WIDTHS) {
    test(`no horizontal overflow — ${theme} @${width}px`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.emulateMedia({ colorScheme: theme });
      await page.setViewportSize({ width, height: 900 });

      const overflowing: string[] = [];
      for (const path of PATHS) {
        await page.goto(path);
        // Let the mock latency resolve, so tables and rails are actually there.
        await page.waitForTimeout(350);
        const overflow = await page.evaluate(() => {
          const root = document.documentElement;
          return root.scrollWidth - root.clientWidth;
        });
        // One pixel is sub-pixel rounding, not a layout fault.
        if (overflow > 1) overflowing.push(`${path} overflows by ${overflow}px`);
      }

      expect(overflowing, overflowing.join("\n")).toEqual([]);
    });
  }
}
