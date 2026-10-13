import { defineConfig, devices } from "@playwright/test";

import {
  API_URL,
  WEB_URL,
  localServers,
  localSupabase,
} from "./support/localStack.ts";

import type { ServerSpec } from "./support/localStack.ts";

// 接続先はローカルの Supabase だけ。.dev.vars と web の .env（開発用のクラウド）は読まない
const servers = localServers(localSupabase());

const webServer = (spec: ServerSpec, url: string) => ({
  command: [spec.command, ...spec.args].join(" "),
  cwd: spec.cwd,
  env: spec.env,
  url,
  reuseExistingServer: false,
  timeout: 120_000,
});

/** 3 幅（docs/steering/ui-design.md）。375px は狭い端末の代表 */
const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
} as const;

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: Object.entries(VIEWPORTS).map(([name, viewport]) => ({
    name,
    use: { ...devices["Desktop Chrome"], viewport },
  })),
  webServer: [
    webServer(servers.api, `${API_URL}/`),
    webServer(servers.web, WEB_URL),
  ],
});
