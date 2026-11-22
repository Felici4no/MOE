/**
 * MoeOffice — o escritório do MOE sobre o motor original do Pixel Agents.
 *
 * Reaproveitado sem modificação: OfficeState (mundo, assentos, FSM dos personagens),
 * OfficeCanvas (canvas, DPR, hit-test), renderer, sprites, perfis de personagem e
 * o protocolo de mensagens (`agentCreated`, `agentStatus`) tratado por useExtensionMessages.
 *
 * Removido da experiência: terminais, editor de layout, barra de cards, rádio,
 * roster, conversas, usage bars e qualquer controle de agentes de código.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { dispatchMockMessages } from '../src/browserMock.js';
import { ZOOM_MAX, ZOOM_MIN } from '../src/constants.js';
import { useExtensionMessages } from '../src/hooks/useExtensionMessages.js';
import { setSoundEnabled } from '../src/notificationSound.js';
import { OfficeCanvas } from '../src/office/components/OfficeCanvas.js';
import { EditorState } from '../src/office/editor/editorState.js';
import { OfficeState } from '../src/office/engine/officeState.js';
import { overlayProjection } from '../src/office/projection.js';
import { TILE_SIZE, TileType } from '../src/office/types.js';
import { onHostMessage, postToHost } from './hostBridge';
import { MOE_NPCS, type MoeNpc } from './protocol';

/** Elenco: ids de personagem fora da faixa usada por agentes reais; looks dos perfis padrão. */
const CAST: Record<MoeNpc, { id: number; palette: number; nome: string; papel: string }> = {
  maia: { id: 9101, palette: 1, nome: 'Maia', papel: 'Gestora' },
  leo: { id: 9102, palette: 2, nome: 'Léo', papel: 'Colega' },
  nara: { id: 9103, palette: 3, nome: 'Nara', papel: 'Cliente interno' },
};
const NPC_BY_ID = new Map<number, MoeNpc>(MOE_NPCS.map((n) => [CAST[n].id, n]));

const officeStateRef = { current: null as OfficeState | null };
function getOfficeState(): OfficeState {
  officeStateRef.current ??= new OfficeState();
  return officeStateRef.current;
}

/** Injeta uma mensagem do protocolo upstream pelo mesmo canal do modo navegador. */
function deliver(data: Record<string, unknown>): void {
  window.dispatchEvent(new MessageEvent('message', { data }));
}

/** Limites (em tiles) da parte construída do layout, ignorando tiles VOID. */
function contentBounds() {
  const layout = getOfficeState().getLayout();
  let minC = layout.cols, minR = layout.rows, maxC = -1, maxR = -1;
  layout.tiles.forEach((t, i) => {
    if (t === TileType.VOID) return;
    const c = i % layout.cols, r = Math.floor(i / layout.cols);
    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
  });
  if (maxC < 0) return { minC: 0, minR: 0, maxC: layout.cols - 1, maxR: layout.rows - 1, cols: layout.cols, rows: layout.rows };
  return { minC, minR, maxC, maxR, cols: layout.cols, rows: layout.rows };
}

/** Maior zoom inteiro que mostra todo o escritório construído, e o pan que o centraliza. */
function frameOffice(container: HTMLElement | null): { zoom: number; pan: { x: number; y: number } } {
  if (!container) return { zoom: ZOOM_MIN, pan: { x: 0, y: 0 } };
  const b = contentBounds();
  const dpr = window.devicePixelRatio || 1;
  const w = (b.maxC - b.minC + 1) * TILE_SIZE;
  const h = (b.maxR - b.minR + 1) * TILE_SIZE;
  const zoom = Math.max(
    ZOOM_MIN,
    Math.min(ZOOM_MAX, Math.floor(Math.min((container.clientWidth * dpr) / w, (container.clientHeight * dpr) / h))),
  );
  // Pan em pixels de dispositivo: desloca o centro do mapa para o centro do conteúdo.
  const pan = {
    x: (b.cols / 2 - (b.minC + b.maxC + 1) / 2) * TILE_SIZE * zoom,
    y: (b.rows / 2 - (b.minR + b.maxR + 1) / 2) * TILE_SIZE * zoom,
  };
  return { zoom, pan };
}

export function MoeOffice() {
  const { layoutReady } = useExtensionMessages(getOfficeState);
  const editorState = useMemo(() => new EditorState(), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Partial<Record<MoeNpc, HTMLDivElement | null>>>({});
  const panRef = useRef({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [speaking, setSpeaking] = useState<MoeNpc | null>(null);
  const spawned = useRef(false);
  const noop = useCallback(() => {}, []);

  // Assets e layout originais, depois que o listener do hook estiver registrado.
  useEffect(() => {
    dispatchMockMessages();
  }, []);

  // Com o layout pronto: enquadra o escritório e coloca Maia, Léo e Nara em assentos reais.
  useEffect(() => {
    if (!layoutReady || spawned.current) return;
    spawned.current = true;
    const framed = frameOffice(containerRef.current);
    panRef.current = framed.pan;
    setZoom(framed.zoom);
    for (const npc of MOE_NPCS) {
      deliver({ type: 'agentCreated', id: CAST[npc].id, palette: CAST[npc].palette, repeat: 0 });
      deliver({ type: 'agentStatus', id: CAST[npc].id, status: 'idle' });
    }
    const os = getOfficeState();
    const present = MOE_NPCS.filter((n) => os.characters.has(CAST[n].id));
    (window as unknown as { __moeOffice?: unknown }).__moeOffice = {
      ready: true,
      characters: present,
      layout: { cols: os.getLayout().cols, rows: os.getLayout().rows, furniture: os.getLayout().furniture.length },
    };
    postToHost({ source: 'moe-office', type: 'moe:ready', npcs: present });
  }, [layoutReady]);

  // Reenquadra ao redimensionar.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (!spawned.current) return;
      const framed = frameOffice(el);
      panRef.current = framed.pan;
      setZoom(framed.zoom);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Comandos do host (validados em hostBridge).
  useEffect(
    () =>
      onHostMessage((msg) => {
        const os = getOfficeState();
        switch (msg.type) {
          case 'moe:focus':
            // Destaca o personagem (contorno de seleção do upstream) sem mover a câmera:
            // o escritório inteiro continua enquadrado.
            if (msg.npc) os.selectAndFollow(CAST[msg.npc].id);
            else os.selectedAgentId = null;
            os.breakCameraFollow();
            break;
          case 'moe:speaking':
            // Um personagem fala por vez: só ele fica "ativo" (animação de digitação na mesa).
            setSpeaking(msg.npc);
            for (const npc of MOE_NPCS) {
              deliver({ type: 'agentStatus', id: CAST[npc].id, status: npc === msg.npc ? 'active' : 'idle' });
            }
            break;
          case 'moe:awaiting':
            if (msg.npc) os.showWaitingBubble(CAST[msg.npc].id, true);
            break;
          case 'moe:sound':
            setSoundEnabled(msg.enabled);
            break;
          case 'moe:reset':
            setSpeaking(null);
            os.breakCameraFollow();
            os.selectedAgentId = null;
            panRef.current = frameOffice(containerRef.current).pan;
            for (const npc of MOE_NPCS) deliver({ type: 'agentStatus', id: CAST[npc].id, status: 'idle' });
            break;
        }
      }),
    [],
  );

  // Rótulos de nome e papel acima de cada personagem (mesma projeção do upstream).
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const el = containerRef.current;
      if (!el) return;
      const os = getOfficeState();
      const rect = el.getBoundingClientRect();
      const project = overlayProjection(os.getLayout(), rect, zoom, panRef.current, window.devicePixelRatio || 1);
      for (const npc of MOE_NPCS) {
        const label = labelRefs.current[npc];
        const ch = os.characters.get(CAST[npc].id);
        if (!label) continue;
        if (!ch) {
          label.style.display = 'none';
          continue;
        }
        label.style.display = 'block';
        label.style.transform = `translate(${Math.round(project.toScreenX(ch.x))}px, ${Math.round(project.toScreenY(ch.y - 30))}px) translate(-50%, -100%)`;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [zoom]);

  const onCharacterClick = useCallback((agentId: number) => {
    const npc = NPC_BY_ID.get(agentId);
    if (npc) postToHost({ source: 'moe-office', type: 'moe:npcClick', npc });
  }, []);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Escritório em pixel art com Maia, gestora; Léo, colega; e Nara, cliente interno."
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <OfficeCanvas
        officeState={getOfficeState()}
        onClick={onCharacterClick}
        isEditMode={false}
        editorState={editorState}
        onEditorTileAction={noop}
        onEditorEraseAction={noop}
        onEditorSelectionChange={noop}
        onDeleteSelected={noop}
        onRotateSelected={noop}
        onDrop={noop}
        editorTick={0}
        zoom={zoom}
        onZoomChange={setZoom}
        panRef={panRef}
        showAreas={false}
        activeAreaLabel={null}
      />
      {MOE_NPCS.map((npc) => (
        <div
          key={npc}
          ref={(el) => {
            labelRefs.current[npc] = el;
          }}
          data-moe-label={npc}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            display: 'none',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            padding: '3px 6px',
            border: '2px solid #111',
            background: npc === speaking ? '#ffe14d' : '#f6f7fa',
            color: '#111',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 12,
            lineHeight: 1.2,
            zIndex: npc === speaking ? 2 : 1,
            boxShadow: '2px 2px 0 #111',
          }}
        >
          <strong style={{ fontFamily: 'inherit', fontSize: 'inherit' }}>{CAST[npc].nome}</strong> · {CAST[npc].papel}
          {npc === speaking ? ' · falando' : ''}
        </div>
      ))}
    </div>
  );
}
