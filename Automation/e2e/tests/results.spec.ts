import { test, expect, APIRequestContext, Locator, Page } from "@playwright/test";

/**
 * Verifies that the numbers displayed on Sales and Dashboard match the
 * source of truth (the backend API). The pattern:
 *
 *   1. Fetch raw rows from /api/sales, /api/inventory, /api/payments/stats.
 *   2. Compute the expected totals using the SAME math the UI components
 *      use (mirrored from SalesPage.jsx and DashboardPage.jsx).
 *   3. Open the page and assert the rendered text equals the expected
 *      formatted value.
 *
 * This catches three classes of regression:
 *  - the UI math drifts from the API (e.g. adding `.discount` twice)
 *  - the API stops returning a field
 *  - a future refactor breaks the formatter
 *
 * The spec is read-only — it doesn't create or delete any rows, so it can
 * run against a populated DB without polluting it.
 */
const API_URL = process.env.E2E_API_URL || "http://localhost:8080";

// Mirrors the formatter used by both SalesPage.jsx and DashboardPage.jsx:
//   const fmt = n => Number(n).toLocaleString(undefined, { ... });
// We hard-code en-US locale because that's what Chromium uses by default
// in Playwright, and to keep the assertion deterministic regardless of
// the developer's machine locale.
function fmt(n: number): string {
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

async function readStoreId(page: Page): Promise<string> {
  // After global-setup the user is logged in, but localStorage hasn't been
  // hydrated yet for the new context. Visit any protected page so the
  // Topbar's useEffect writes `currentStore_<id>` to localStorage, then
  // read it back.
  await page.goto("/dashboard");
  const id = await page.evaluate(() => {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!raw) return "1";
    try {
      const u = JSON.parse(raw);
      return localStorage.getItem(`currentStore_${u?.id ?? "guest"}`) || "1";
    } catch {
      return "1";
    }
  });
  return id || "1";
}

async function fetchJson<T>(api: APIRequestContext, path: string, storeId: string): Promise<T> {
  const r = await api.get(`${API_URL}${path}`, {
    headers: { "X-Store-Id": storeId, "X-Username": "admin", "X-User-Role": "Admin" },
  });
  if (!r.ok()) {
    throw new Error(`GET ${path} responded ${r.status()}`);
  }
  return (await r.json()) as T;
}

type Sale = {
  status?: string;
  totalPrice?: number;
  remainingBalance?: number;
  monthlyPayment?: number;
};
type InventoryItem = { status?: string };
type PaymentStats = { thisDay?: number; thisMonth?: number; thisYear?: number };

/** Locator that finds the metric value text by its visible label. */
function statValueByLabel(scope: Page | Locator, label: string): Locator {
  return scope
    .locator("xpath=.//*[normalize-space(text())=" + JSON.stringify(label) + "]/preceding-sibling::*[1]")
    .first();
}

test.describe.serial("Result accuracy", () => {
  let storeId: string;
  let sales: Sale[];
  let inventory: InventoryItem[];
  let paymentStats: PaymentStats;

  // Expected values derived from the API.
  let expSalesTotal: number;
  let expOutstanding: number;
  let expActiveLoans: number;
  let expTotalBuyers: number;
  let expTotalProducts: number;
  let expItemsAvailable: number;
  let expActiveBuyers: number;

  test.beforeAll(async ({ browser, request }) => {
    const ctx  = await browser.newContext({ storageState: "storageState.json" });
    const page = await ctx.newPage();
    storeId    = await readStoreId(page);
    await ctx.close();

    sales        = await fetchJson<Sale[]>(request, "/api/sales", storeId);
    inventory    = await fetchJson<InventoryItem[]>(request, "/api/inventory", storeId);
    paymentStats = await fetchJson<PaymentStats>(request, "/api/payments/stats", storeId);

    // Mirror SalesPage.jsx stats (lines ~278–287):
    const activeLoans = sales.filter(s => (s.status || "Active") === "Active");
    expActiveLoans  = activeLoans.length;
    expTotalBuyers  = sales.length;
    expSalesTotal   = sales.reduce((s, l) => s + ((l.totalPrice || 0) - (l.remainingBalance || 0)), 0);
    expOutstanding  = sales.reduce((s, l) => s + (l.remainingBalance || 0), 0);

    // Mirror DashboardPage.jsx stats (lines ~143–167):
    expTotalProducts  = inventory.length;
    expItemsAvailable = inventory.filter(i => i.status === "In Stock").length;
    expActiveBuyers   = activeLoans.length;
  });

  // ── Sales page ──────────────────────────────────────────────────────
  test.describe("Sales page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sales");
      await expect(page.getByRole("heading", { name: /^sales$/i })).toBeVisible();
    });

    test("Active Loans count matches API", async ({ page }) => {
      await expect(statValueByLabel(page, "Active Loans")).toHaveText(String(expActiveLoans));
    });

    test("Sales Total matches sum of (totalPrice - remainingBalance)", async ({ page }) => {
      await expect(statValueByLabel(page, "Sales Total")).toHaveText(`₱${fmt(expSalesTotal)}`);
    });

    test("Outstanding Balance matches sum of remainingBalance", async ({ page }) => {
      await expect(statValueByLabel(page, "Outstanding Balance")).toHaveText(`₱${fmt(expOutstanding)}`);
    });

    test("Filter sidebar This Day Sale matches /api/payments/stats.thisDay", async ({ page }) => {
      const expected = `₱${fmt(Number(paymentStats.thisDay) || 0)}`;
      const value = page
        .locator("xpath=.//*[normalize-space(text())='This Day Sale']/following-sibling::*[1]")
        .first();
      await expect(value).toHaveText(expected);
    });

    test("Filter sidebar This Month Sale matches /api/payments/stats.thisMonth", async ({ page }) => {
      const expected = `₱${fmt(Number(paymentStats.thisMonth) || 0)}`;
      const value = page
        .locator("xpath=.//*[normalize-space(text())='This Month Sale']/following-sibling::*[1]")
        .first();
      await expect(value).toHaveText(expected);
    });

    test("Filter sidebar This Year Sale matches /api/payments/stats.thisYear", async ({ page }) => {
      const expected = `₱${fmt(Number(paymentStats.thisYear) || 0)}`;
      const value = page
        .locator("xpath=.//*[normalize-space(text())='This Year Sale']/following-sibling::*[1]")
        .first();
      await expect(value).toHaveText(expected);
    });
  });

  // ── Dashboard ───────────────────────────────────────────────────────
  test.describe("Dashboard", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: /^dashboard$/i })).toBeVisible();
    });

    test("Total Products matches inventory length", async ({ page }) => {
      await expect(statValueByLabel(page, "Total Products").first()).toHaveText(String(expTotalProducts));
    });

    test("Items Available matches in-stock count", async ({ page }) => {
      await expect(statValueByLabel(page, "Items Available")).toHaveText(String(expItemsAvailable));
    });

    test("Active Buyers matches active sale count", async ({ page }) => {
      await expect(statValueByLabel(page, "Active Buyers")).toHaveText(String(expActiveBuyers));
    });

    test("Sales This Month matches sum of (totalPrice - remainingBalance)", async ({ page }) => {
      // The card label is "Sales This Month" — same value as Sales page's
      // "Sales Total". The two derive from the exact same expression, so
      // they must agree.
      await expect(statValueByLabel(page, "Sales This Month")).toHaveText(`₱${fmt(expSalesTotal)}`);
    });

    test("Filter sidebar Today Sales matches /api/payments/stats.thisDay", async ({ page }) => {
      const expected = `₱${fmt(Number(paymentStats.thisDay) || 0)}`;
      const value = page
        .locator("xpath=.//*[normalize-space(text())='Today Sales']/following-sibling::*[1]")
        .first();
      await expect(value).toHaveText(expected);
    });

    test("Filter sidebar Monthly Sales matches /api/payments/stats.thisMonth", async ({ page }) => {
      const expected = `₱${fmt(Number(paymentStats.thisMonth) || 0)}`;
      const value = page
        .locator("xpath=.//*[normalize-space(text())='Monthly Sales']/following-sibling::*[1]")
        .first();
      await expect(value).toHaveText(expected);
    });
  });
});
