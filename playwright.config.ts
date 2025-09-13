import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'playwright/tests',
  webServer: {
    command: 'npm run dev -- --port 5174',
    port: 5174,
    reuseExistingServer: true
  },
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 }
  }
})