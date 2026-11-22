import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHostMessage, parseOfficeMessage, MOE_NPCS } from '../office/moe-webview/protocol.ts';

test('aceita apenas os três NPCs do elenco', () => {
  assert.deepEqual([...MOE_NPCS], ['maia', 'leo', 'nara']);
  assert.ok(parseHostMessage({ source: 'moe-host', type: 'moe:focus', npc: 'leo' }));
  assert.equal(parseHostMessage({ source: 'moe-host', type: 'moe:focus', npc: 'lia' }), null);
});

test('ignora mensagens sem a origem lógica correta ou com esquema inválido', () => {
  assert.equal(parseHostMessage({ type: 'moe:reset' }), null);
  assert.equal(parseHostMessage({ source: 'moe-office', type: 'moe:reset' }), null);
  assert.equal(parseHostMessage({ source: 'moe-host', type: 'moe:sound', enabled: 'sim' }), null);
  assert.equal(parseHostMessage({ source: 'moe-host', type: 'agentCreated', id: 1 }), null);
  assert.equal(parseHostMessage('moe:reset'), null);
  assert.equal(parseHostMessage(null), null);
});

test('mensagens do escritório: ready exige lista válida; erro é truncado', () => {
  assert.ok(parseOfficeMessage({ source: 'moe-office', type: 'moe:ready', npcs: ['maia', 'leo', 'nara'] }));
  assert.equal(parseOfficeMessage({ source: 'moe-office', type: 'moe:ready', npcs: ['maia', 'x'] }), null);
  assert.equal(parseOfficeMessage({ source: 'moe-office', type: 'moe:npcClick', npc: 9101 }), null);
  const err = parseOfficeMessage({ source: 'moe-office', type: 'moe:error', message: 'x'.repeat(500) });
  assert.equal(err.message.length, 200);
});

test('o protocolo não transporta texto do participante', () => {
  // Campos extras são descartados pelo parser: nada além de ids e flags cruza a fronteira.
  const msg = parseHostMessage({ source: 'moe-host', type: 'moe:focus', npc: 'maia', resposta: 'segredo' });
  assert.deepEqual(Object.keys(msg).sort(), ['npc', 'source', 'type']);
});
