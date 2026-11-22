/**
 * Build do webview original do Pixel Agents em modo demonstração local.
 * Preserva a estrutura upstream sem reimplementação do renderer/Canvas.
 *
 * Requer git submodule update --init --recursive e npm install no vendor.
 * Altera os três arquivos APENAS durante o build e os restaura em finally.
 */
import { existsSync, readFileSync, writeFileSync, cpSync, rmSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const vendor = resolve(root, "vendor/pixel-agents");
const target = resolve(root, "frontend/public/office-engine");
const webview = resolve(vendor, "webview-ui");
const flags = [
  ["webview-ui/src/main.tsx", "if (isBrowserRuntime && import.meta.env.DEV)", "if (isBrowserRuntime && (import.meta.env.DEV || import.meta.env.VITE_OFFICE_DEMO === '1'))"],
  ["webview-ui/src/App.tsx", "if (isBrowserRuntime && import.meta.env.DEV)", "if (isBrowserRuntime && (import.meta.env.DEV || import.meta.env.VITE_OFFICE_DEMO === '1'))"],
  ["webview-ui/src/transport/index.ts", "if (import.meta.env.DEV)", "if (import.meta.env.DEV || import.meta.env.VITE_OFFICE_DEMO === '1')"],
];
if (!existsSync(resolve(vendor, "package.json"))) {
  throw new Error("Pixel Agents ausente. Execute git submodule update --init --recursive");
}

const originals = [];
try {
  for (const [path, before, after] of flags) {
    const file = resolve(vendor, path);
    const original = readFileSync(file, "utf8");
    if (!original.includes(before)) throw new Error(`Upstream incompatível: ${path}`);
    originals.push({ file, original });
    writeFileSync(file, original.replace(before, after));
  }
  // A versão pinned necessita de suas dependências no próprio workspace.
  execFileSync("npm", ["ci", "--ignore-scripts"], { cwd: vendor, stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, CI: "true" } });
  execFileSync("npm", ["run", "build:webview"], { cwd: vendor, stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, VITE_OFFICE_DEMO: "1" } });
  const built = resolve(vendor, "dist/webview");
  if (!existsSync(resolve(built, "index.html"))) throw new Error("Build Pixel Agents sem index.html");
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(built, target, { recursive: true });
  console.log(`Office visual disponível em ${target}`);
} finally {
  for (const { file, original } of originals) writeFileSync(file, original);
}
