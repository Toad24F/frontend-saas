import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  timeout: 45_000,
  globalSetup: './tests/browser/global-setup.js',
  use: { browserName: 'chromium', channel: 'msedge', headless: true, trace: 'retain-on-failure' },
});
