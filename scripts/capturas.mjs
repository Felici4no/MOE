// Gera capturas de tela das rotas principais (desktop e celular).
// Uso: node scripts/capturas.mjs [baseUrl] [pastaDeSaida]
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.argv[2] ?? 'http://localhost:3000';
const out = process.argv[3] ?? 'docs/capturas';
await mkdir(out, { recursive: true });

const rotas = [
  ['landing', '/'],
  ['entrevista', '/entrevista'],
  ['relatorio-tres', '/relatorio/demo-tres'],
  ['relatorio-zero', '/relatorio/demo-zero'],
  ['apoio', '/relatorio/demo-apoio'],
  ['privacidade', '/privacidade'],
];
const viewports = (process.env.VIEWPORTS ?? 'desktop,mobile').split(',');
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

const browser = await chromium.launch();
for (const v of viewports) {
  const page = await browser.newPage({ viewport: sizes[v], deviceScaleFactor: 1, reducedMotion: 'reduce' });
  for (const [nome, rota] of rotas) {
    if (process.env.ONLY && !process.env.ONLY.split(',').includes(nome)) continue;
    await page.goto(base + rota, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: `${out}/${nome}-${v}.png`, fullPage: process.env.FULL !== '0' });
    console.log(`${nome}-${v}${overflow > 0 ? `  ⚠ overflow horizontal ${overflow}px` : ''}`);
  }
  await page.close();
}
await browser.close();
