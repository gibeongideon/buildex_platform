import { test, expect, type Page } from "@playwright/test";
import { importTemplateCsv } from "../lib/rules/product-import";

/*
  Bulk import and main products.

  The two features meet at the cap: a spreadsheet is the easiest way to blow
  past four main products, so the import has to refuse it the same way the form
  does, and say which column to change.
*/

const upload = (page: Page, name: string, body: string) =>
  page.setInputFiles('input[type="file"]', {
    name,
    mimeType: "text/csv",
    buffer: Buffer.from(body),
  });

/** The template, with its one `yes` turned off so it fits any supplier. */
const templateWithoutMains = () => importTemplateCsv().replace(/,yes$/m, ",no");

test("a price list imports, having been checked row by row", async ({ page }) => {
  await page.goto("/connect/catalogue/import");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Import products", {
    timeout: 15_000,
  });

  await upload(page, "price-list.csv", templateWithoutMains());
  await expect(page.getByText("2 ready")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: /Import 2 products/ }).click();
  await expect(page.getByText(/2 products imported/)).toBeVisible({ timeout: 20_000 });

  // And they are really in the catalogue, not just reported.
  await page.goto("/connect/catalogue");
  await page.getByPlaceholder("Search by name, SKU or category").fill("ACME-OPC325");
  // By role: the row's action buttons carry sr-only labels containing the same
  // product name, so a bare text match resolves to four elements.
  await expect(
    page.getByRole("link", { name: "OPC 32.5N Cement", exact: true }),
  ).toBeVisible({ timeout: 15_000 });
});

test("a bad row is named by line, and the good rows still import", async ({ page }) => {
  await page.goto("/connect/catalogue/import");
  await upload(
    page,
    "messy.csv",
    templateWithoutMains() + "Broken,Nope,BAD-1,,bag,,1-9:100,1,2,Nairobi Metro,no\n",
  );

  await expect(page.getByText("2 ready")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("1 problem")).toBeVisible();

  // Named by column, with the offending value quoted back.
  const errors = page.locator("table").first();
  await expect(errors).toContainText("category");
  await expect(errors).toContainText('"Nope" is not recognised');
});

test("the import cannot exceed four main products", async ({ page }) => {
  /*
    Savannah Cement already shows four. The template marks one row `yes`, so
    the whole file is held back rather than silently importing a fifth.
  */
  await page.goto("/connect/catalogue/import");
  await upload(page, "with-main.csv", importTemplateCsv());

  await expect(page.getByText("2 ready")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Too many main products")).toBeVisible();
  await expect(page.getByRole("button", { name: /Import 2 products/ })).toBeDisabled();
});

test("a spreadsheet file is refused with instructions, not a silent failure", async ({
  page,
}) => {
  await page.goto("/connect/catalogue/import");
  await page.setInputFiles('input[type="file"]', {
    name: "price-list.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from("PK not readable as text"),
  });

  await expect(page.getByText("Save it as CSV first")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("2 ready")).toHaveCount(0);
});

test("a supplier's chosen main products lead their storefront", async ({ page }) => {
  await page.goto("/marketplace/manufacturer/mfr_savannah");
  const band = page.getByRole("region", { name: "Main products" });
  await expect(band).toBeVisible({ timeout: 15_000 });

  // Filtering puts the full range back in charge — the shortlist is no longer
  // the answer once the buyer has said what they want.
  await page.getByPlaceholder("Search this store").fill("culvert");
  await expect(band).toHaveCount(0);
});

test("the directory says whose selection the strip is", async ({ page }) => {
  await page.goto("/marketplace/manufacturers");
  // Savannah has chosen four, so the label is their own claim.
  await expect(page.getByText("Main products").first()).toBeVisible({ timeout: 15_000 });
  // A supplier who has not chosen gets our wording instead.
  await expect(page.getByText("From their range").first()).toBeVisible();
});
