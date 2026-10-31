import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "playwright/tests",
  webServer: {
    command: "npm run dev -- --port 5174",
    port: 5174,
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:5174/RobotSpaceBattler/",
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
});
