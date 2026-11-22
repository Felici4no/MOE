/**
 * MoeOffice — o escritório do MOE sobre o motor original do Pixel Agents.
 *
 * Reaproveitado sem modificação: OfficeState (mundo, assentos, FSM dos personagens),
 * OfficeCanvas (canvas, DPR, hit-test), renderer, sprites, perfis de personagem e
 * o protocolo de mensagens (`agentCreated`, `agentStatus`) tratado por useExtensionMessages.
 * O elenco (nomes, papéis, aparência) chega do host por `moe:cast`.
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
import type { CastMember, MoeNpc } from './protocol';

/** Personagem em cena: id de personagem fora da faixa usada por agentes reais. */
type Spawned = CastMember & { id: number };
const FIRST_ID = 9101;

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
  const [line, setLine] = useState<{ npc: MoeNpc; text: string } | null>(null);
  const [shown, setShown] = useState(0);
  const balloonRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<{ npc: MoeNpc; text: string } | null>(null);
  useEffect(() => {
    lineRef.current = line;
  }, [line]);
  const [cast, setCast] = useState<Spawned[]>([]);
  const castRef = useRef<Spawned[]>([]);
  const pendingCast = useRef<CastMember[] | null>(null);
  const framed = useRef(false);
  const spawned = useRef(false);
  const noop = useCallback(() => {}, []);

  /** Cria os personagens pelo protocolo do upstream (agentCreated), com o visual de cada um. */
  const spawn = useCallback((members: CastMember[]) => {
    if (spawned.current) return;
    spawned.current = true;
    const seen = new Map<number, number>();
    const list: Spawned[] = members.map((m, i) => ({ ...m, id: FIRST_ID + i }));
    for (const m of list) {
      const repeat = seen.get(m.look) ?? 0; // mesmo visual duas vezes → outra cor de roupa (regra do upstream)
      seen.set(m.look, repeat + 1);
      deliver({ type: 'agentCreated', id: m.id, palette: m.look, repeat });
      deliver({ type: 'agentStatus', id: m.id, status: 'idle' });
    }
    castRef.current = list;
    setCast(list);
    const os = getOfficeState();
    const present = list.filter((m) => os.characters.has(m.id)).map((m) => m.key);
    (window as unknown as { __moeOffice?: unknown }).__moeOffice = {
      ready: true,
      characters: present,
      layout: { cols: os.getLayout().cols, rows: os.getLayout().rows, furniture: os.getLayout().furniture.length },
    };
    postToHost({ source: 'moe-office', type: 'moe:ready', npcs: present });
  }, []);

  // Assets e layout originais, depois que o listener do hook estiver registrado.
  useEffect(() => {
    dispatchMockMessages();
  }, []);

  // Com o layout pronto: enquadra o escritório e pede o elenco ao host.
  useEffect(() => {
    if (!layoutReady || framed.current) return;
    framed.current = true;
    const f = frameOffice(containerRef.current);
    panRef.current = f.pan;
    setZoom(f.zoom);
    if (pendingCast.current) spawn(pendingCast.current);
    else postToHost({ source: 'moe-office', type: 'moe:layout' });
  }, [layoutReady, spawn]);

  // Reenquadra ao redimensionar.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (!framed.current) return;
      const f = frameOffice(el);
      panRef.current = f.pan;
      setZoom(f.zoom);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Comandos do host (validados em hostBridge).
  useEffect(
    () =>
      onHostMessage((msg) => {
        const os = getOfficeState();
        const idOf = (npc: MoeNpc | null) => castRef.current.find((m) => m.key === npc)?.id;
        switch (msg.type) {
          case 'moe:cast':
            if (framed.current) spawn(msg.cast);
            else pendingCast.current = msg.cast;
            break;
          case 'moe:focus': {
            // Destaca o personagem (contorno de seleção do upstream) sem mover a câmera.
            const id = idOf(msg.npc);
            if (id !== undefined) os.selectAndFollow(id);
            else os.selectedAgentId = null;
            os.breakCameraFollow();
            break;
          }
          case 'moe:speaking':
            // Um personagem fala por vez: só ele fica "ativo" (animação de trabalho na mesa).
            setSpeaking(msg.npc);
            for (const m of castRef.current) {
              deliver({ type: 'agentStatus', id: m.id, status: m.key === msg.npc ? 'active' : 'idle' });
            }
            break;
          case 'moe:line':
            setLine(msg.npc && msg.text.trim() ? { npc: msg.npc, text: msg.text.trim() } : null);
            setShown(0);
            break;
          case 'moe:awaiting': {
            const id = idOf(msg.npc);
            if (id !== undefined) os.showWaitingBubble(id, true);
            break;
          }
          case 'moe:sound':
            setSoundEnabled(msg.enabled);
            break;
          case 'moe:reset':
            setSpeaking(null);
            setLine(null);
            os.breakCameraFollow();
            os.selectedAgentId = null;
            panRef.current = frameOffice(containerRef.current).pan;
            for (const m of castRef.current) deliver({ type: 'agentStatus', id: m.id, status: 'idle' });
            break;
        }
      }),
    [spawn],
  );

  // Balão de fala: o texto aparece no ritmo da voz enquanto o personagem fala; ao calar, fica inteiro.
  useEffect(() => {
    if (!line) return;
    if (speaking !== line.npc) {
      setShown(line.text.length);
      return;
    }
    const t = window.setInterval(() => setShown((n) => Math.min(line.text.length, n + 1)), 60);
    return () => window.clearInterval(t);
  }, [line, speaking]);

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
      for (const m of castRef.current) {
        const label = labelRefs.current[m.key];
        const ch = os.characters.get(m.id);
        if (!label) continue;
        if (!ch) {
          label.style.display = 'none';
          continue;
        }
        label.style.display = 'block';
        const lhalf = label.offsetWidth / 2;
        const lx = Math.min(rect.width - lhalf - 4, Math.max(lhalf + 4, project.toScreenX(ch.x)));
        label.style.transform = `translate(${Math.round(lx)}px, ${Math.round(project.toScreenY(ch.y - 30))}px) translate(-50%, -100%)`;
      }
      const balloon = balloonRef.current;
      const current = lineRef.current;
      const who = current && castRef.current.find((m) => m.key === current.npc);
      const ch = who ? os.characters.get(who.id) : undefined;
      if (balloon) {
        if (!ch) balloon.style.display = 'none';
        else {
          balloon.style.display = 'block';
          // Acima do rótulo, sem sair do quadro.
          const half = balloon.offsetWidth / 2;
          const x = Math.min(rect.width - half - 6, Math.max(half + 6, project.toScreenX(ch.x)));
          const y = Math.max(balloon.offsetHeight + 6, project.toScreenY(ch.y - 30) - 30);
          balloon.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
          const tail = balloon.querySelector<HTMLElement>('[data-tail]');
          if (tail) tail.style.left = `${Math.round(project.toScreenX(ch.x) - x + half)}px`;
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [zoom]);

  const onCharacterClick = useCallback((agentId: number) => {
    const npc = castRef.current.find((m) => m.id === agentId)?.key;
    if (npc) postToHost({ source: 'moe-office', type: 'moe:npcClick', npc });
  }, []);

  const description = cast.length ? ' com ' + cast.map((m) => m.name + ', ' + m.role).join('; ') : '';

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={'Escritório em pixel art' + description + '.'}
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
      {cast.map(({ key: npc, name, role }) => (
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
          <strong style={{ fontFamily: 'inherit', fontSize: 'inherit' }}>{name}</strong> · {role}
          {npc === speaking ? ' · falando' : ''}
        </div>
      ))}
      {line && (
        <div
          ref={balloonRef}
          data-moe-balloon={line.npc}
          data-talking={speaking === line.npc || undefined}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            display: 'none',
            pointerEvents: 'none',
            width: 'max-content',
            maxWidth: 'min(320px, 70%)',
            padding: '6px 9px',
            border: '2px solid #111',
            background: '#fff',
            color: '#111',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 12.5,
            lineHeight: 1.35,
            zIndex: 3,
            boxShadow: '3px 3px 0 #111',
            opacity: speaking === line.npc ? 1 : 0.92,
          }}
        >
          {line.text.slice(0, Math.max(shown, 1))}
          {speaking === line.npc && <span className="moe-talk" aria-hidden="true"> ▮</span>}
          <span
            data-tail
            style={{
              position: 'absolute',
              bottom: -7,
              width: 10,
              height: 10,
              marginLeft: -5,
              background: '#fff',
              borderRight: '2px solid #111',
              borderBottom: '2px solid #111',
              transform: 'rotate(45deg)',
            }}
          />
        </div>
      )}
    </div>
  );
}
