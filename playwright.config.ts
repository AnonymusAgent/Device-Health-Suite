import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', timeout: 45000, expect: { timeout: 10000 }, fullyParallel: false, workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:5000', viewport: { width: 1440, height: 1000 }, colorScheme: 'light', trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.VEYLO_CHROMIUM_PATH || undefined, args: process.env.VEYLO_CHROMIUM_PATH ? ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] : undefined },
  },
  webServer: { command: 'npm run server:prod', url: 'http://127.0.0.1:5000/api/health', reuseExistingServer: !process.env.CI, timeout: 30000 },
});
