import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001';
const isRemote = baseURL.startsWith('https://');

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: {
    timeout: 20_000,
  },
  fullyParallel: false,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(isRemote
    ? {}
    : {
        webServer: {
          command: 'node dist-server/server/index.js',
          url: 'http://127.0.0.1:3001/api/health',
          reuseExistingServer: !process.env.CI,
          timeout: 20_000,
        },
      }),
});
