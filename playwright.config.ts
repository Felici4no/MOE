import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // Ambiente seguro: sem credenciais de Resend/Agora/LLM, nada sai da máquina.
    command: `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: true,
    env: { RESEND_API_KEY: '', ANALYST_LLM_API_KEY: '', AGORA_APP_ID: '' },
  },
});
