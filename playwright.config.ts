import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "off",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: {
        viewport: { width: 1280, height: 720 },
        hasTouch: true,
      },
    },
  ],
});
