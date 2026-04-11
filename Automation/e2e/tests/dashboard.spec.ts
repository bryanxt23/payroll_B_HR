import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("loads and renders the four stat cards", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard$/);

    // Stat cards (titles are stable text, regardless of CSS module hashes).
    for (const label of [
      /total products/i,
      /items available/i,
      /active buyers/i,
      /sales this month/i,
    ]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test("renders the alert bar with all four alert sections", async ({ page }) => {
    for (const label of [
      /low stock/i,
      /out of stock/i,
      /pending orders/i,
      /payments due/i,
    ]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test("renders the Sales Overview and Inventory Status charts", async ({ page }) => {
    await expect(page.getByText(/sales overview/i).first()).toBeVisible();
    await expect(page.getByText(/inventory status/i).first()).toBeVisible();
  });

  test("renders the Recent Activity card", async ({ page }) => {
    await expect(page.getByText(/recent activity/i).first()).toBeVisible();
  });

  test("category filter sidebar accepts a search term", async ({ page }) => {
    const search = page.getByPlaceholder(/search low stock/i);
    if (await search.isVisible().catch(() => false)) {
      await search.fill("zzz_no_match_xyz");
      // We're not asserting empty state text — just that the input accepts
      // typing without crashing the page.
      await expect(search).toHaveValue("zzz_no_match_xyz");
    }
  });
});
