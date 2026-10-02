// Playwright 스모크(빌드 스펙 8.2절). 빌드 후 vite preview(4173)에 ?latency=0으로 붙습니다.
// 브라우저: 개발 환경의 /opt/pw-browsers(Chromium 1194). 다른 곳이면 PW_CHROMIUM으로 실행 파일 경로를 줍니다.
import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const local = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath = process.env.PW_CHROMIUM ?? (existsSync(local) ? local : undefined);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  fullyParallel: true,
  workers: 4,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173/",
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: "npx vite build && npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173/",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
