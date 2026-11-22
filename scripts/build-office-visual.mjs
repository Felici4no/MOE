/**
 * Build do escritório MOE sobre o webview original do Pixel Agents (MIT © 2026 Pablo De Lucca).
 *
 * Não altera nenhum arquivo do submódulo: copia office/moe-webview/ para
 * vendor/pixel-agents/webview-ui/moe/ (pasta temporária, ignorada), roda o Vite
 * do próprio upstream com nossa config e remove a cópia em `finally`.
 *
 * Saída: frontend/public/office-engine/ (index.html, JS, sprites, layout e JSON decodificados).
 * Pula o build quando submódulo + fontes MOE não mudaram (use --force para refazer).
 */
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const vendor = resolve(root, 'vendor/pixel-agents');
const webview = resolve(vendor, 'webview-ui');
const source = resolve(root, 'office/moe-webview');
const staging = resolve(webview, 'moe');
const target = resolve(root, 'frontend/public/office-engine');
const stampFile = resolve(target, '.moe-build-stamp');
const force = process.argv.includes('--force');
const shell = process.platform === 'win32';

if (!existsSync(resolve(vendor, 'package.json'))) {
  throw new Error('Pixel Agents ausente. Execute: git submodule update --init --recursive');
}

function hashDir(dir, h) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) hashDir(p, h);
    else h.update(name).update(readFileSync(p));
  }
}

// Carimbo independente de .git (um upload para a Vercel não traz metadados git):
// versão + lockfile do upstream e as fontes da entrada MOE.
const h = createHash('sha256')
  .update(readFileSync(resolve(vendor, 'package.json')))
  .update(readFileSync(resolve(vendor, 'package-lock.json')));
hashDir(resolve(webview, 'src'), h);
hashDir(source, h);
const stamp = h.digest('hex');

if (!force && existsSync(stampFile) && readFileSync(stampFile, 'utf8') === stamp && existsSync(resolve(target, 'index.html'))) {
  console.log(`[moe] escritório já construído (${stamp.slice(0, 12)}), nada a fazer.`);
  process.exit(0);
}

const hasDep = (...parts) => [resolve(vendor, 'node_modules', ...parts), resolve(webview, 'node_modules', ...parts)].some(existsSync);
if (!hasDep('vite') || !hasDep('@tailwindcss', 'vite')) {
  console.log('[moe] instalando dependências do Pixel Agents (npm ci)...');
  // --include=dev: builds da Vercel rodam com NODE_ENV=production, que omitiria vite/tailwind.
  execFileSync('npm', ['ci', '--include=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: vendor, stdio: 'inherit', shell, env: { ...process.env, CI: 'true', NODE_ENV: 'development' } });
}

try {
  rmSync(staging, { recursive: true, force: true });
  cpSync(source, staging, { recursive: true });
  mkdirSync(target, { recursive: true });
  execFileSync('npx', ['vite', 'build', '--config', 'moe/vite.moe.config.ts'], {
    cwd: webview,
    stdio: 'inherit',
    shell,
    env: { ...process.env, MOE_OUT_DIR: target, VITE_CONFIG_NATIVE_IGNORE_WARNING: 'true' },
  });
  if (!existsSync(resolve(target, 'index.html'))) throw new Error('Build MOE sem index.html');
  // Licença e atribuição viajam com os assets distribuídos.
  cpSync(resolve(vendor, 'LICENSE'), resolve(target, 'LICENSE-pixel-agents.txt'));
  writeFileSync(stampFile, stamp);
  console.log(`[moe] escritório disponível em ${target}`);
} finally {
  rmSync(staging, { recursive: true, force: true });
}
