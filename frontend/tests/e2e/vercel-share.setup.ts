import { chromium } from "@playwright/test";

/** Previews da Vercel são protegidos: abre o link de compartilhamento uma vez e guarda o cookie. */
export default async function setup() {
  const share = process.env.MOE_SHARE_URL;
  if (!share) return;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(share);
  await page.context().storageState({ path: "test-results/vercel-share.json" });
  await browser.close();
}
