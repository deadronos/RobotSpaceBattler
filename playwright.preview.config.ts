import { defineConfig } from "@playwright/test";

// Runs the e2e specs against the production build served by `vite preview`.
export default defineConfig({
  testDir: "playwright/tests",
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    port: 4173,
    reuseExistingServer: true,
    timeout: 180_000,
  },
  use: {
    baseURL: "http://localhost:4173/RobotSpaceBattler/",
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
});
