import { defineConfig, devices } from '@playwright/test';

/**
 * QA suite (plan 7 / 9): screenshots, axe, console, overflow, links, CLS, no-JS.
 * Runs against the built site served by `astro preview`, so run `npm run build` first.
 *   npx playwright test
 * Screenshots go to $SCREENS_DIR (default test-results/screens).
 */
const PORT = Number(process.env.PREVIEW_PORT ?? 4329);

export default defineConfig({
  testDir: 'tests',
  timeout: 120_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: `npx astro preview --port ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
