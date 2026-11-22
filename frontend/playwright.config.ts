import { defineConfig, devices } from "@playwright/test";

// E2E do MOE contra o build de produção local (next start). Nada sai da máquina:
// a simulação é inteiramente no navegador e o modo é DEMO SEM VOZ.
const PORT = Number(process.env.MOE_E2E_PORT ?? 3210);
const BASE = process.env.MOE_BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: process.env.MOE_SHARE_URL ? "./tests/e2e/vercel-share.setup.ts" : undefined,
  timeout: 90_000,
  workers: 2,
  reporter: [["list"]],
  use: {
    baseURL: BASE ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    storageState: process.env.MOE_SHARE_URL ? "test-results/vercel-share.json" : undefined,
    // Previews injetam a barra da Vercel (vercel.live), que faz requisi��es pr�prias: fora do teste.
    extraHTTPHeaders: BASE ? { "x-vercel-skip-toolbar": "1" } : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: BASE ? undefined : { command: `npx next start -p ${PORT}`, port: PORT, reuseExistingServer: false },
});
