import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Boots the production app on port 3101 and runs against the local
 * store (NEXT_PUBLIC_FORCE_LOCAL_STORE=1) so tests are deterministic and need no
 * Supabase credentials.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3101",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "NEXT_PUBLIC_FORCE_LOCAL_STORE=1 pnpm build && NEXT_PUBLIC_FORCE_LOCAL_STORE=1 pnpm start --port 3101",
    url: "http://localhost:3101",
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
