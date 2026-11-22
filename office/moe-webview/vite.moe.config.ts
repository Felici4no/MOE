/**
 * Build Vite da entrada MOE. Roda de dentro de vendor/pixel-agents/webview-ui/moe/
 * (cópia temporária), com os plugins e o pipeline de assets do próprio upstream.
 */
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

import { buildAssetIndex, buildFurnitureCatalog } from '../../core/src/assets/build.ts';
import { decodeAllCarpets, decodeAllFloors, decodeAllFurniture, decodeAllWalls } from '../../core/src/assets/loader.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const webview = path.resolve(here, '..');
const assetsDir = path.join(webview, 'public', 'assets');
const outDir = process.env.MOE_OUT_DIR;
if (!outDir) throw new Error('MOE_OUT_DIR não definido');

/** Gera os mesmos sidecars JSON que o servidor de dev do upstream serve, como arquivos estáticos. */
function moeStaticAssets(): Plugin {
  return {
    name: 'moe-static-assets',
    closeBundle() {
      const dist = path.join(outDir!, 'assets');
      const decoded = path.join(dist, 'decoded');
      fs.mkdirSync(decoded, { recursive: true });
      const catalog = buildFurnitureCatalog(assetsDir);
      fs.writeFileSync(path.join(dist, 'furniture-catalog.json'), JSON.stringify(catalog));
      fs.writeFileSync(path.join(dist, 'asset-index.json'), JSON.stringify(buildAssetIndex(assetsDir)));
      fs.writeFileSync(path.join(decoded, 'floors.json'), JSON.stringify(decodeAllFloors(assetsDir)));
      fs.writeFileSync(path.join(decoded, 'walls.json'), JSON.stringify(decodeAllWalls(assetsDir)));
      fs.writeFileSync(path.join(decoded, 'carpets.json'), JSON.stringify(decodeAllCarpets(assetsDir)));
      fs.writeFileSync(path.join(decoded, 'furniture.json'), JSON.stringify(decodeAllFurniture(assetsDir, catalog)));
    },
  };
}

export default defineConfig({
  root: here,
  base: './',
  publicDir: path.join(webview, 'public'),
  plugins: [tailwindcss(), react(), moeStaticAssets()],
  // Ativa o caminho "navegador sem servidor" do upstream (browserMock + ponte de
  // mensagens do transporte) no build estático, sem editar o código upstream.
  // Só browserMock.ts e transport/index.ts leem esta flag no que é importado aqui.
  define: { 'import.meta.env.DEV': 'true' },
  build: { outDir, emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});
