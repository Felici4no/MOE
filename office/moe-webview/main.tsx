/**
 * Entrada MOE do escritório. Camada fina sobre o webview do Pixel Agents
 * (MIT © 2026 Pablo De Lucca): reaproveita OfficeState, OfficeCanvas, renderer,
 * sprites e o carregador de assets do modo navegador SEM alterar o upstream.
 *
 * Este arquivo é copiado para vendor/pixel-agents/webview-ui/moe/ apenas
 * durante o build (scripts/build-office-visual.mjs) e removido em seguida.
 */
import './moe.css';

import { createRoot } from 'react-dom/client';

import { initBrowserMock } from '../src/browserMock.js';
import { MoeOffice } from './MoeOffice';
import { postToHost } from './hostBridge';

async function main() {
  // Carrega pisos, paredes, móveis e layout originais (pré-decodificados no build).
  await initBrowserMock();
  createRoot(document.getElementById('root')!).render(<MoeOffice />);
}

main().catch((err: unknown) => {
  console.error('[MOE] falha ao iniciar o escritório', err);
  postToHost({ source: 'moe-office', type: 'moe:error', message: 'Não foi possível carregar o escritório.' });
});
