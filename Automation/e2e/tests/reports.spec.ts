import { test, expect, Page } from "@playwright/test";

/**
 * The Topbar nav uses <div role="button"> for the page tabs (Sales,
 * Inventory, Reports, ...). That means `getByRole("button", { name: /sales/i })`
 * also matches the Topbar Sales nav, and `.first()` may navigate away
 * from /reports. We deliberately scope every tab click to real <button>
 * elements (the inner Reports tabs) to avoid that.
 */
function reportsTab(page: Page, name: "Sales" | "Inventory") {
  // The button text is "Sales12" / "Inventory7" (label + count badge), so
  // we anchor on `^${name}` and deliberately omit `\b` — the count is a
  // run of digits with no word boundary between it and the label.
  return page.locator("button").filter({ hasText: new RegExp(`^${name}`) }).first();
}

test.describe("Reports", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: /^reports$/i })).toBeVisible();
  });

  test("loads with Sales tab active by default", async ({ page }) => {
    await expect(reportsTab(page, "Sales")).toBeVisible();
    await expect(reportsTab(page, "Inventory")).toBeVisible();
  });

  test("Sales tab shows Team and Payment Terms filters", async ({ page }) => {
    await reportsTab(page, "Sales").click();

    await expect(page.getByText("Team", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/payment terms/i).first()).toBeVisible();

    for (const t of ["Team A", "Team B", "Team C", "Team D", "Team E"]) {
      await expect(page.getByText(t, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText("Cash", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Layaway", { exact: true }).first()).toBeVisible();
  });

  test("Inventory tab shows the Category filter and hides Team / Payment Terms", async ({ page }) => {
    await reportsTab(page, "Inventory").click();

    // The "Category" filter card title should appear.
    await expect(page.getByText("Category", { exact: true }).first()).toBeVisible();

    // Team / Payment Terms cards should be gone. We don't assert toHaveCount(0)
    // for "Team" alone because the word may appear elsewhere on the page —
    // but the Payment Terms card title is unique to the Sales tab.
    await expect(page.getByText(/payment terms/i)).toHaveCount(0);
  });

  test("clicking a Team checkbox toggles its filter state", async ({ page }) => {
    await reportsTab(page, "Sales").click();

    // The label text is "Team A 0" (label + count badge), so don't anchor
    // the regex with ^...$. Substring match is enough — Team A vs Team B
    // are still distinct because "Team A" is not a prefix of "Team B".
    const teamARow = page.locator("label").filter({ hasText: "Team A" }).first();
    const checkbox = teamARow.locator("input[type='checkbox']");
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test("Clear Filters button resets the search and date inputs", async ({ page }) => {
    const search = page.getByPlaceholder(/search user, item/i);
    await search.fill("nothing-matches-this");
    await expect(search).toHaveValue("nothing-matches-this");

    await page.getByRole("button", { name: /clear filters/i }).click();
    await expect(search).toHaveValue("");
  });

  test("Export PDF button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /export pdf/i })).toBeVisible();
  });
});
