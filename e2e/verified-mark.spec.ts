import { test, expect } from "@playwright/test";

/*
  The verification mark.

  It replaced a stock check icon in semantic green, and it carries two levels
  where there used to be one. What is worth guarding is not how it looks but
  what it claims: a full mark means all five checks cleared, a part mark has to
  be visibly and audibly different, and neither may appear against a supplier
  that has earned nothing.

  The marks that stand alone beside a name are labelled; the one inside the
  storefront's hero pill is not, because the pill's own text says it.
*/

test("each mark announces the level it actually carries", async ({ page }) => {
  await page.goto("/marketplace/manufacturers");
  await expect(page.getByText("Main products").first()).toBeVisible({ timeout: 15_000 });

  // A full mark names the standard it attests to.
  const full = page.getByRole("img", { name: /^Verified supplier/ }).first();
  await expect(full).toHaveAccessibleName(/physical site visit/i);

  /*
    Mount Kenya Roofing may list products but may not take orders. It used to
    appear with no mark at all, reading exactly like a supplier that had never
    been checked — and it must never be announced as a verified one.
  */
  const part = page.getByRole("img", { name: /^Part verified supplier/ }).first();
  await expect(part).toHaveAccessibleName(/cannot take orders/i);
});

test("the two marks are drawn differently, not merely labelled differently", async ({
  page,
}) => {
  /*
    A hurried or colour-blind reader should tell them apart by shape: the full
    mark is a struck seal, the part mark an outline of the same silhouette.
    Asserting the fill stops that collapsing into one styling.
  */
  await page.goto("/marketplace/manufacturers");
  await expect(page.getByText("Main products").first()).toBeVisible({ timeout: 15_000 });

  const fillFor = (namePattern: RegExp) =>
    page
      .getByRole("img", { name: namePattern })
      .first()
      .evaluate((node) => {
        const seal = node.querySelector("path");
        return seal ? getComputedStyle(seal).fill : "";
      });

  const full = await fillFor(/^Verified supplier/);
  const part = await fillFor(/^Part verified supplier/);

  expect(full).not.toBe("none");
  expect(part).toBe("none");
});

test("the storefront hero states the level in words", async ({ page }) => {
  /*
    Scoped to the hero band: the site-wide promo strip says "Verified
    suppliers", which a substring match happily mistakes for this badge.
  */
  const hero = (p: typeof page) => p.locator("section.on-brand").first();

  await page.goto("/marketplace/manufacturer/mfr_savannah");
  await expect(hero(page).getByText("Verified supplier", { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  await page.goto("/marketplace/manufacturer/mfr_mount_kenya_roofing");
  await expect(hero(page).getByText("Part verified", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(hero(page).getByText("Verified supplier", { exact: true })).toHaveCount(0);
});

test("an unverified supplier carries no mark", async ({ page }) => {
  // Kakamega Hardware is still in review: no public storefront, nothing to badge.
  await page.goto("/marketplace/manufacturer/mfr_kakamega_hardware");
  await expect(page.getByText("Store not available")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("img", { name: /verified supplier/i })).toHaveCount(0);
});

test("the product card leads with the price, then the mark", async ({ page }) => {
  await page.goto("/marketplace/search");
  const card = page.locator("article").first();
  await expect(card).toBeVisible({ timeout: 15_000 });

  // Name and price are no longer the same colour. The regression this guards is
  // someone setting the price back to `text-foreground`.
  const nameColour = await card
    .locator("h3 a")
    .evaluate((el) => getComputedStyle(el).color);
  const priceColour = await card
    .locator("p.text-price")
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  expect(priceColour).not.toBe(nameColour);

  await expect(card.getByText("Verified", { exact: true })).toBeVisible();
});
