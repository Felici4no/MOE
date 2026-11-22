/**
 * MoeOfficeBridge — protocolo tipado entre o app Next.js (host) e o escritório
 * Pixel Agents embutido (iframe de mesma origem).
 *
 * Regras:
 * - só ids de NPC e flags cruzam a fronteira: nenhuma resposta do participante,
 *   nenhum dado pessoal e nenhuma credencial;
 * - ambos os lados validam `origin`, `source` e o esquema antes de agir.
 *
 * Fonte única: importado pelo webview (build Vite) e pelo frontend (alias @moe/protocol).
 */
export const MOE_NPCS = ['maia', 'leo', 'nara'] as const;
export type MoeNpc = (typeof MOE_NPCS)[number];

export type HostToOffice =
  | { source: 'moe-host'; type: 'moe:focus'; npc: MoeNpc | null }
  | { source: 'moe-host'; type: 'moe:speaking'; npc: MoeNpc | null }
  | { source: 'moe-host'; type: 'moe:awaiting'; npc: MoeNpc | null }
  | { source: 'moe-host'; type: 'moe:sound'; enabled: boolean }
  | { source: 'moe-host'; type: 'moe:reset' };

/** Comando do host sem o campo `source` (preenchido por quem envia). */
export type HostCommand = HostToOffice extends infer T ? (T extends unknown ? Omit<T, 'source'> : never) : never;

export type OfficeToHost =
  | { source: 'moe-office'; type: 'moe:ready'; npcs: MoeNpc[] }
  | { source: 'moe-office'; type: 'moe:npcClick'; npc: MoeNpc }
  | { source: 'moe-office'; type: 'moe:error'; message: string };

const isObj = (d: unknown): d is Record<string, unknown> => typeof d === 'object' && d !== null && !Array.isArray(d);
const isNpc = (v: unknown): v is MoeNpc => typeof v === 'string' && (MOE_NPCS as readonly string[]).includes(v);
const isNpcOrNull = (v: unknown): v is MoeNpc | null => v === null || isNpc(v);

export function parseHostMessage(d: unknown): HostToOffice | null {
  if (!isObj(d) || d.source !== 'moe-host') return null;
  switch (d.type) {
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
    case 'moe:ready':
      return Array.isArray(d.npcs) && d.npcs.every(isNpc) ? { source: 'moe-office', type: 'moe:ready', npcs: d.npcs } : null;
    case 'moe:npcClick':
      return isNpc(d.npc) ? { source: 'moe-office', type: 'moe:npcClick', npc: d.npc } : null;
    case 'moe:error':
      return typeof d.message === 'string' ? { source: 'moe-office', type: 'moe:error', message: d.message.slice(0, 200) } : null;
    default:
      return null;
  }
}
