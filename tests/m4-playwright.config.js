import { defineConfig } from '@playwright/test';
// Esta suite no inicia ni modifica backend/BD: verifica UI contra contratos HTTP interceptados.
export default defineConfig({
  testDir: './m4-browser', workers: 1, reporter: 'list', timeout: 30000,
  outputDir: '../test-results/m4',
  use: { baseURL: 'http://127.0.0.1:5188', browserName: 'chromium', channel: 'msedge', headless: true },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5188 --strictPort', url: 'http://127.0.0.1:5188', reuseExistingServer: false },
});
