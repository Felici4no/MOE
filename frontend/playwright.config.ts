import { defineConfig, devices } from "@playwright/test";

// E2E do MOE contra o build de produção local (next start). Nada sai da máquina:
// a simulação é inteiramente no navegador e o modo é DEMO SEM VOZ.
const PORT = Number(process.env.MOE_E2E_PORT ?? 3210);
const BASE = process.env.MOE_BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  workers: 2,
  reporter: [["list"]],
  use: { baseURL: BASE ?? `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: BASE ? undefined : { command: `npx next start -p ${PORT}`, port: PORT, reuseExistingServer: false },
});
