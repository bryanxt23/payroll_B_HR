import { test, expect, APIRequestContext, Page } from "@playwright/test";

/**
 * Independently verifies that /api/payments/stats (the source for the
 * "This Day Sale / This Month Sale / This Year Sale" strips on the Sales
 * page) really matches the recorded payment ledger in the database.
 *
 * results.spec.ts already asserts that the UI strips display whatever
 * /api/payments/stats returns. This spec goes one layer deeper: it
 * re-sums payments from an independent source — the activity log
 * (category=SALES, actionType=Paid), which SalesController.recordPayment
 * writes for every payment — and asserts the totals agree.
 *
 * Why activity logs rather than SalesLoan.paymentNotes?
 * SalesController.delete removes a sale row (and its paymentNotes column
 * with it) but does NOT cascade-delete Payment rows. That means
 * paymentNotes is a lossy ledger — past payments on since-deleted sales
 * vanish from it. Activity logs are never deleted on sale removal, so
 * they remain an accurate historical record.
 *
 * Tolerance: two sources of drift mean we compare with a percentage
 * band rather than exact equality.
 *  - The activity-log amount is rounded to whole pesos via
 *    String.format("%.0f", amount) → ±0.5 peso per entry.
 *  - Historical data drift: Payment rows and ActivityLog rows can get
 *    out of sync across past deploys, partial failures, or admin-side
 *    writes. This is real production data we can't clean up from a test.
 * A 15% tolerance still easily catches the bugs we care about (stats
 * returning 0, double-counted totals, wrong store, off-by-10x).
 */
const API_URL = process.env.E2E_API_URL || "http://localhost:8080";

// ── Auth/store plumbing (mirrors results.spec.ts) ──────────────────────────

async function readStoreId(page: Page): Promise<string> {
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
  if (!r.ok()) throw new Error(`GET ${path} responded ${r.status()}`);
  return (await r.json()) as T;
}

// ── Activity log ledger parser ─────────────────────────────────────────────

interface ActivityLog {
  createdAt?: string;     // ISO-8601 from Jackson
  category?: string;
  actionType?: string;
  details?: string;
}

/** Extract ₱amount from "Payment ₱500, Remaining ₱100" or similar. */
function parsePaidAmount(details: string | undefined): number {
  if (!details) return 0;
  // First "Payment ₱<n>" in the string — the details template always
  // leads with this and may append ", Remaining ₱<n>" which we must not
  // double-count.
  const m = details.match(/Payment\s*₱?\s*([\d,]+(?:\.\d+)?)/i);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function recomputeFromLogs(logs: ActivityLog[]) {
  const now = new Date();
  const dayStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart  = new Date(now.getFullYear(), 0, 1);

  let thisDay = 0, thisMonth = 0, thisYear = 0;

  for (const l of logs) {
    if (l.category !== "SALES" || l.actionType !== "Paid") continue;
    if (!l.createdAt) continue;
    const d = new Date(l.createdAt);
    if (isNaN(d.getTime())) continue;
    const amt = parsePaidAmount(l.details);
    if (!amt) continue;
    if (d >= yearStart)  thisYear  += amt;
    if (d >= monthStart) thisMonth += amt;
    if (d >= dayStart)   thisDay   += amt;
  }
  return { thisDay, thisMonth, thisYear };
}

/**
 * 15% percentage band + absolute floor of ₱10. Catches the failure
 * modes we care about (stats is 0, stats is wildly wrong, stats is
 * off by orders of magnitude) while tolerating peso-rounding and
 * small historical data drift.
 */
function withinBand(a: number, b: number): boolean {
  const tol = Math.max(10, 0.15 * Math.max(Math.abs(a), Math.abs(b)));
  return Math.abs(a - b) <= tol;
}

// ── Tests ──────────────────────────────────────────────────────────────────

test.describe("Sales stats — database verification", () => {
  test("backend /api/payments/stats agrees with sales activity log ledger", async ({ page, request }) => {
    const storeId = await readStoreId(page);
    const stats   = await fetchJson<{ thisDay: number; thisMonth: number; thisYear: number }>(
      request, "/api/payments/stats", storeId
    );
    const logs    = await fetchJson<ActivityLog[]>(
      request, "/api/activity/report?category=SALES", storeId
    );

    const computed = recomputeFromLogs(logs);

    expect(
      withinBand(computed.thisDay, stats.thisDay),
      `thisDay: logs ₱${computed.thisDay.toFixed(2)} vs backend ₱${stats.thisDay.toFixed(2)} — outside 15% band`
    ).toBe(true);
    expect(
      withinBand(computed.thisMonth, stats.thisMonth),
      `thisMonth: logs ₱${computed.thisMonth.toFixed(2)} vs backend ₱${stats.thisMonth.toFixed(2)} — outside 15% band`
    ).toBe(true);
    expect(
      withinBand(computed.thisYear, stats.thisYear),
      `thisYear: logs ₱${computed.thisYear.toFixed(2)} vs backend ₱${stats.thisYear.toFixed(2)} — outside 15% band`
    ).toBe(true);

    // Sanity: monotonicity. thisYear ≥ thisMonth ≥ thisDay always.
    expect(stats.thisYear,  "thisYear must be ≥ thisMonth"). toBeGreaterThanOrEqual(stats.thisMonth);
    expect(stats.thisMonth, "thisMonth must be ≥ thisDay"). toBeGreaterThanOrEqual(stats.thisDay);
  });

  test("recording a payment increases all three buckets by that amount", async ({ page, request }) => {
    // End-to-end delta: the ledger, the backend aggregate, and the UI
    // strips all move together when a real payment happens. We pick any
    // Active sale with ≥₱1 remaining and pay ₱1 against it so this is
    // safe to run against a populated DB.
    const storeId = await readStoreId(page);
    const sales   = await fetchJson<Array<{ id?: number; status?: string; remainingBalance?: number }>>(
      request, "/api/sales", storeId
    );
    const target  = sales.find(s =>
      (s.status || "Active") === "Active" &&
      Number(s.remainingBalance || 0) >= 1 &&
      s.id != null
    );
    test.skip(!target, "No Active sale with remaining balance — nothing to pay against.");

    const before = await fetchJson<{ thisDay: number; thisMonth: number; thisYear: number }>(
      request, "/api/payments/stats", storeId
    );

    const PAY_AMOUNT = 1;
    const payRes = await request.put(`${API_URL}/api/sales/${target!.id}/pay`, {
      headers: {
        "X-Store-Id": storeId,
        "X-Username": "admin",
        "X-User-Role": "Admin",
        "Content-Type": "application/json",
      },
      data: { amount: PAY_AMOUNT, notes: "E2E stats probe" },
    });
    expect(payRes.ok(), `PUT /api/sales/${target!.id}/pay => ${payRes.status()}`).toBe(true);

    const after = await fetchJson<{ thisDay: number; thisMonth: number; thisYear: number }>(
      request, "/api/payments/stats", storeId
    );

    const near = (a: number, b: number) => Math.abs(a - b) <= 0.01;
    expect(near(after.thisDay   - before.thisDay,   PAY_AMOUNT), `thisDay   Δ not ₱${PAY_AMOUNT}`).toBe(true);
    expect(near(after.thisMonth - before.thisMonth, PAY_AMOUNT), `thisMonth Δ not ₱${PAY_AMOUNT}`).toBe(true);
    expect(near(after.thisYear  - before.thisYear,  PAY_AMOUNT), `thisYear  Δ not ₱${PAY_AMOUNT}`).toBe(true);

    // And the Sales page picks the new numbers up on reload.
    await page.goto("/sales");
    await expect(page.getByRole("button", { name: /\+ Add Buyer/i }).first()).toBeVisible();

    const stripNumber = async (label: RegExp) => {
      const text = (await page.getByText(label).first().locator("xpath=..").textContent()) || "";
      const m = text.match(/₱?\s*([\d,]+(?:\.\d+)?)/);
      return m ? parseFloat(m[1].replace(/,/g, "")) : NaN;
    };

    expect(await stripNumber(/this day sale/i)).  toBe(Math.round(after.thisDay));
    expect(await stripNumber(/this month sale/i)).toBe(Math.round(after.thisMonth));
    expect(await stripNumber(/this year sale/i)). toBe(Math.round(after.thisYear));
  });
});
