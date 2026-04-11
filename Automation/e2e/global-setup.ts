import { chromium, FullConfig, request } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Global setup — runs ONCE before any test.
 *
 *  1. Verify backend + UI are reachable, fail fast with a friendly error
 *     so the developer knows to start them.
 *  2. Log in as the seeded admin user (admin / root) through the UI and
 *     persist the resulting sessionStorage to storageState.json. Every
 *     test then starts pre-authenticated.
 */
const UI_URL      = process.env.E2E_BASE_URL || "http://localhost:3000";
const API_URL     = process.env.E2E_API_URL  || "http://localhost:8080";
const ADMIN_USER  = process.env.E2E_ADMIN_USER || "admin";
const ADMIN_PASS  = process.env.E2E_ADMIN_PASS || "root";
const STATE_PATH  = path.resolve(__dirname, "storageState.json");

async function ensureReachable() {
  const api = await request.newContext();
  try {
    const r = await api.get(`${API_URL}/api/stores`, { timeout: 5_000 });
    if (!r.ok()) {
      throw new Error(`Backend at ${API_URL} responded ${r.status()}.`);
    }
  } catch (e: any) {
    throw new Error(
      `\n\n❌ Backend not reachable at ${API_URL}.\n` +
      `   Start it with: cd Backend/main && ./mvnw spring-boot:run\n\n` +
      `   Original error: ${e.message}\n`
    );
  } finally {
    await api.dispose();
  }
}

export default async function globalSetup(_config: FullConfig) {
  await ensureReachable();

  const browser = await chromium.launch();
  const ctx     = await browser.newContext();
  const page    = await ctx.newPage();

  try {
    await page.goto(`${UI_URL}/login`, { waitUntil: "domcontentloaded" });
  } catch (e: any) {
    await browser.close();
    throw new Error(
      `\n\n❌ UI not reachable at ${UI_URL}.\n` +
      `   Start it with: cd UI && npm start\n\n` +
      `   Original error: ${e.message}\n`
    );
  }

  // The login form uses placeholder text; CSS modules hash class names so
  // we deliberately key off accessible attributes.
  await page.getByPlaceholder(/username/i).fill(ADMIN_USER);
  await page.getByPlaceholder(/password/i).fill(ADMIN_PASS);
  await page.getByRole("button", { name: /^login$/i }).click();

  // Login redirects to /dashboard on success.
  await page.waitForURL(/\/dashboard$/, { timeout: 15_000 });

  // The user object is stored in sessionStorage by default. Playwright's
  // storageState only captures cookies + localStorage, so copy it across
  // so the saved state survives a fresh context.
  const userJson = await page.evaluate(() => sessionStorage.getItem("user"));
  if (userJson) {
    await page.evaluate((u) => localStorage.setItem("user", u), userJson);
  }

  await ctx.storageState({ path: STATE_PATH });
  await browser.close();

  if (!fs.existsSync(STATE_PATH)) {
    throw new Error("Failed to write storageState.json");
  }
}
