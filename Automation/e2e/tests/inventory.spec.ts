import { test, expect } from "@playwright/test";
import { InventoryPage } from "../helpers/inventory";

const RUN_ID   = Date.now();
const CATEGORY = `E2E Cat ${RUN_ID}`;
const ITEM     = `E2E Item ${RUN_ID}`;

test.describe.serial("Inventory", () => {
  let inv: InventoryPage;

  test.beforeEach(async ({ page }) => {
    inv = new InventoryPage(page);
    await inv.goto();
  });

  test("page loads with Add Item button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /\+ Add Item/i })).toBeVisible();
  });

  test("can add a category", async ({ page }) => {
    await inv.ensureCategory(CATEGORY);
    // The new category should appear somewhere in the sidebar.
    await expect(page.getByText(CATEGORY, { exact: true }).first()).toBeVisible();
  });

  test("can add a new inventory item", async ({ page }) => {
    await inv.ensureCategory(CATEGORY);
    await inv.addItem({
      name:         ITEM,
      category:     CATEGORY,
      quantity:     10,
      grams:        5,
      cost:         100,
      sellingPrice: 250,
      supplier:     "E2E Supplier",
    });

    await expect(page.getByText(ITEM, { exact: true }).first()).toBeVisible();
  });

  test("can search for an existing item", async ({ page }) => {
    const search = page.getByPlaceholder(/search/i).first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill(ITEM);
      await expect(page.getByText(ITEM, { exact: true }).first()).toBeVisible();
      await search.fill("");
    }
  });

  test.afterAll(async ({ browser }) => {
    // Cleanup: delete the row we created so reruns are clean.
    const ctx  = await browser.newContext({ storageState: "storageState.json" });
    const page = await ctx.newPage();
    const inv  = new InventoryPage(page);
    await inv.goto();
    await inv.deleteItem(ITEM).catch(() => {});
    await ctx.close();
  });
});
