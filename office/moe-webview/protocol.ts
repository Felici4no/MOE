/**
 * MoeOfficeBridge — protocolo tipado entre o app Next.js (host) e o escritório
 * Pixel Agents embutido (iframe de mesma origem).
 *
 * Sequência: escritório → `moe:layout` (pronto para receber elenco) → host → `moe:cast`
 * → escritório cria os personagens → `moe:ready`. Depois: focus/speaking/awaiting/sound/reset.
 *
 * Regras:
 * - cruzam a fronteira só chaves de personagem, nome/papel/aparência configurados pela empresa
 *   e flags; nunca respostas do participante nem credenciais;
 * - ambos os lados validam `origin`, `source` e o esquema antes de agir.
 *
 * Fonte única: importado pelo webview (build Vite) e pelo frontend (alias @moe/protocol).
 */
export const MAX_CAST = 4;
export const LOOK_MAX = 5;

/** Chave de personagem: slug curto (ex.: "maia") ou id de persona (32 hex). */
export type MoeNpc = string;
export interface CastMember { key: MoeNpc; name: string; role: string; look: number }

export type HostToOffice =
  | { source: 'moe-host'; type: 'moe:cast'; cast: CastMember[] }
  | { source: 'moe-host'; type: 'moe:focus'; npc: MoeNpc | null }
  | { source: 'moe-host'; type: 'moe:speaking'; npc: MoeNpc | null }
  | { source: 'moe-host'; type: 'moe:awaiting'; npc: MoeNpc | null }
  | { source: 'moe-host'; type: 'moe:sound'; enabled: boolean }
  | { source: 'moe-host'; type: 'moe:reset' };

/** Comando do host sem o campo `source` (preenchido por quem envia). */
export type HostCommand = HostToOffice extends infer T ? (T extends unknown ? Omit<T, 'source'> : never) : never;

export type OfficeToHost =
  | { source: 'moe-office'; type: 'moe:layout' }
  | { source: 'moe-office'; type: 'moe:ready'; npcs: MoeNpc[] }
  | { source: 'moe-office'; type: 'moe:npcClick'; npc: MoeNpc }
  | { source: 'moe-office'; type: 'moe:error'; message: string };

const KEY_RE = /^[a-z0-9-]{1,32}$/;
const isObj = (d: unknown): d is Record<string, unknown> => typeof d === 'object' && d !== null && !Array.isArray(d);
export const isNpc = (v: unknown): v is MoeNpc => typeof v === 'string' && KEY_RE.test(v);
const isNpcOrNull = (v: unknown): v is MoeNpc | null => v === null || isNpc(v);
const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

function parseCast(v: unknown): CastMember[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_CAST) return null;
  const out: CastMember[] = [];
  for (const m of v) {
    if (!isObj(m) || !isNpc(m.key) || !text(m.name, 40) || !text(m.role, 60)) return null;
    if (typeof m.look !== 'number' || !Number.isInteger(m.look) || m.look < 0 || m.look > LOOK_MAX) return null;
    if (out.some((x) => x.key === m.key)) return null;
    out.push({ key: m.key, name: (m.name as string).trim(), role: (m.role as string).trim(), look: m.look });
  }
  return out;
}

export function parseHostMessage(d: unknown): HostToOffice | null {
  if (!isObj(d) || d.source !== 'moe-host') return null;
  switch (d.type) {
    case 'moe:cast': {
      const cast = parseCast(d.cast);
      return cast ? { source: 'moe-host', type: 'moe:cast', cast } : null;
    }
    case 'moe:focus':
    case 'moe:speaking':
    case 'moe:awaiting':
      return isNpcOrNull(d.npc) ? { source: 'moe-host', type: d.type, npc: d.npc } : null;
    case 'moe:sound':
      return typeof d.enabled === 'boolean' ? { source: 'moe-host', type: 'moe:sound', enabled: d.enabled } : null;
    case 'moe:reset':
      return { source: 'moe-host', type: 'moe:reset' };
    default:
      return null;
  }
}

export function parseOfficeMessage(d: unknown): OfficeToHost | null {
  if (!isObj(d) || d.source !== 'moe-office') return null;
  switch (d.type) {
    case 'moe:layout':
      return { source: 'moe-office', type: 'moe:layout' };
    case 'moe:ready':
      return Array.isArray(d.npcs) && d.npcs.length <= MAX_CAST && d.npcs.every(isNpc)
        ? { source: 'moe-office', type: 'moe:ready', npcs: d.npcs }
        : null;
    case 'moe:npcClick':
      return isNpc(d.npc) ? { source: 'moe-office', type: 'moe:npcClick', npc: d.npc } : null;
    case 'moe:error':
      return typeof d.message === 'string' ? { source: 'moe-office', type: 'moe:error', message: d.message.slice(0, 200) } : null;
    default:
      return null;
  }
}
