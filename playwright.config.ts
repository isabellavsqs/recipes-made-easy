import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (PLAN.md §4). They drive a real browser against the app,
// which uses the Supabase project in .env.local, so they create real test
// accounts named test-…@example.com.
// Run with: npm test   (starts `npm run dev` if it isn't running already)
export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
