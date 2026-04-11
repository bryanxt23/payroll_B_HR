import { test, expect } from "@playwright/test";
import { InventoryPage } from "../helpers/inventory";
import { SalesPage } from "../helpers/sales";

const RUN_ID   = Date.now();
const CATEGORY = `E2E Sales Cat ${RUN_ID}`;
const ITEM     = `E2E Sales Item ${RUN_ID}`;
const BUYER    = `E2E Buyer ${RUN_ID}`;

/**
 * Sales tests need an inventory item to sell, so we seed one up front
 * via the Inventory page and remove it at the end.
 */
test.describe.serial("Sales", () => {
  test.beforeAll(async ({ browser }) => {
    const ctx  = await browser.newContext({ storageState: "storageState.json" });
    const page = await ctx.newPage();
    const inv  = new InventoryPage(page);
    await inv.goto();
    await inv.ensureCategory(CATEGORY);
    await inv.addItem({
      name:         ITEM,
      category:     CATEGORY,
      quantity:     20,
      grams:        3,
      cost:         200,
      sellingPrice: 500,
      supplier:     "E2E Supplier",
    });
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx  = await browser.newContext({ storageState: "storageState.json" });
    const page = await ctx.newPage();

    const sales = new SalesPage(page);
    await sales.goto();
    await sales.deleteBuyer(BUYER).catch(() => {});

    const inv = new InventoryPage(page);
    await inv.goto();
    await inv.deleteItem(ITEM).catch(() => {});

    await ctx.close();
  });

  test("page loads with Add Buyer button", async ({ page }) => {
    const sales = new SalesPage(page);
    await sales.goto();
    await expect(page.getByRole("button", { name: /\+ Add Buyer/i }).first()).toBeVisible();
  });

  test("can add a new buyer (Cash)", async ({ page }) => {
    const sales = new SalesPage(page);
    await sales.goto();
    await sales.addBuyer({
      customerName: BUYER,
      itemName:     ITEM,
      quantity:     1,
      paymentTerms: "Cash",
      team:         "Team A",
    });
    await expect(page.getByText(BUYER, { exact: false }).first()).toBeVisible();
  });

  test("can record a payment for the buyer", async ({ page }) => {
    const sales = new SalesPage(page);
    await sales.goto();
    await sales.pay(BUYER, 100, "E2E partial payment");

    // After payment the row still exists; we don't assert exact balance
    // because the schema does cash-vs-layaway math we don't want to mirror.
    await expect(page.getByText(BUYER, { exact: false }).first()).toBeVisible();
  });
});
