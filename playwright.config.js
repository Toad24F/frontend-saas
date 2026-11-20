import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/navegador',
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  timeout: 45_000,
  globalSetup: './tests/navegador/integracion.preparacion.js',
  use: { browserName: 'chromium', channel: 'msedge', headless: true, trace: 'retain-on-failure' },
});
