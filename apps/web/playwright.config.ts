import { defineConfig, devices } from '@playwright/test';

// Runs against the production build served by scripts/serve.mjs (service worker enabled).
// WebKit is not installed in CI here, so iPhone/Pixel projects use Chromium with device emulation.
// Real iOS Safari must still be checked on a device — see docs/07-ios-checklist.md.
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:4200', trace: 'off', screenshot: 'only-on-failure' },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'pixel', use: { ...devices['Pixel 7'] }, testMatch: /responsive|pwa/ },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } }, testMatch: /responsive|pwa/ },
  ],
});
