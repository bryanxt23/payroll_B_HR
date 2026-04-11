import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration.
 *
 * Assumes the React UI is running at http://localhost:3000 and the Spring
 * Boot backend at http://localhost:8080. Start both manually before running
 * the tests (see README.md).
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,            // tests share state (sales/inventory rows)
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                      // serialize so cleanup is reliable
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  // Login once and reuse the session for every test.
  globalSetup: require.resolve("./global-setup"),

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "storageState.json",
      },
    },
  ],
});
