import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import os from "node:os";

// E2E ponta a ponta: FastAPI real (SQLite temporário) + Next em modo dev (proxy /api).
// Uso: npx playwright test -c playwright.fullstack.config.ts
const API = 8011, WEB = 3211;
const db = path.join(os.tmpdir(), `moe-e2e-${Date.now()}.db`).replace(/\\/g, "/");
const python = path.join(__dirname, "..", "backend", ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");

export default defineConfig({
  testDir: "tests/e2e-fullstack",
  timeout: 120_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${WEB}`, trace: "retain-on-failure", ...devices["Desktop Chrome"] },
  webServer: [
    {
      command: `"${python}" -m uvicorn app.main:app --port ${API}`,
      cwd: path.join(__dirname, "..", "backend"),
      url: `http://127.0.0.1:${API}/api/v1/health`,
      reuseExistingServer: false,
      env: {
        PF_ENV: "dev", PF_DATABASE_URL: `sqlite:///${db}`, PF_PUBLIC_URL: `http://localhost:${WEB}`,
        AGORA_APP_ID: "", AGORA_APP_CERTIFICATE: "", ANALYST_LLM_API_KEY: "", STRIPE_SECRET_KEY: "",
      },
    },
    {
      command: `npx next dev -p ${WEB}`,
      url: `http://localhost:${WEB}/moe`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { PF_API_ORIGIN: `http://127.0.0.1:${API}` },
    },
  ],
});
