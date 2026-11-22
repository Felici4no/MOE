import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHostMessage, parseOfficeMessage, MAX_CAST } from '../office/moe-webview/protocol.ts';

const member = (key, look = 1) => ({ key, name: key.toUpperCase(), role: 'Colega', look });

test('elenco: até 4 personagens, chaves válidas e únicas, visual 0..5', () => {
  assert.equal(MAX_CAST, 4);
  const ok = parseHostMessage({ source: 'moe-host', type: 'moe:cast', cast: [member('maia'), member('a'.repeat(32), 5)] });
  assert.equal(ok.cast.length, 2);
  for (const cast of [
    [],
    [member('a'), member('b'), member('c'), member('d'), member('e')],
    [member('Maia')],
    [member('maia', 6)],
    [member('maia'), member('maia')],
    [{ key: 'maia', name: '', role: 'x', look: 1 }],
  ]) assert.equal(parseHostMessage({ source: 'moe-host', type: 'moe:cast', cast }), null);
});

test('ignora mensagens sem a origem lógica correta ou com esquema inválido', () => {
  assert.ok(parseHostMessage({ source: 'moe-host', type: 'moe:focus', npc: 'leo' }));
  assert.equal(parseHostMessage({ source: 'moe-host', type: 'moe:focus', npc: '../x' }), null);
  assert.equal(parseHostMessage({ type: 'moe:reset' }), null);
  assert.equal(parseHostMessage({ source: 'moe-office', type: 'moe:reset' }), null);
  assert.equal(parseHostMessage({ source: 'moe-host', type: 'moe:sound', enabled: 'sim' }), null);
  assert.equal(parseHostMessage({ source: 'moe-host', type: 'agentCreated', id: 1 }), null);
  assert.equal(parseHostMessage('moe:reset'), null);
  assert.equal(parseHostMessage(null), null);
});

test('mensagens do escritório: layout, ready com chaves válidas; erro é truncado', () => {
  assert.ok(parseOfficeMessage({ source: 'moe-office', type: 'moe:layout' }));
  assert.ok(parseOfficeMessage({ source: 'moe-office', type: 'moe:ready', npcs: ['maia', 'leo', 'nara'] }));
  assert.equal(parseOfficeMessage({ source: 'moe-office', type: 'moe:ready', npcs: ['maia', 'X'] }), null);
  assert.equal(parseOfficeMessage({ source: 'moe-office', type: 'moe:npcClick', npc: 9101 }), null);
  const err = parseOfficeMessage({ source: 'moe-office', type: 'moe:error', message: 'x'.repeat(500) });
  assert.equal(err.message.length, 200);
});

test('o protocolo não transporta texto do participante', () => {
  const msg = parseHostMessage({ source: 'moe-host', type: 'moe:focus', npc: 'maia', resposta: 'segredo' });
  assert.deepEqual(Object.keys(msg).sort(), ['npc', 'source', 'type']);
  const cast = parseHostMessage({ source: 'moe-host', type: 'moe:cast', cast: [{ ...member('maia'), resposta: 'segredo' }] });
  assert.deepEqual(Object.keys(cast.cast[0]).sort(), ['key', 'look', 'name', 'role']);
});
