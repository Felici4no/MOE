import test from 'node:test';
import assert from 'node:assert/strict';
import { iniciarSimulacao, obterCena, obterFase, responder, encerrarSimulacao, criarResumo } from '../src/office-experience/engine.js';
import { CENARIOS, PERSONAGENS } from '../src/office-experience/scenarios.js';

test('inicia o primeiro diálogo com a gestora', () => {
  const s = iniciarSimulacao();
  assert.equal(obterCena(s).npcId, 'maia');
  assert.equal(PERSONAGENS.maia.funcao, 'Gestora');
});

test('conclui a simulação em três respostas, sem atribuir talentos', () => {
  let s = iniciarSimulacao();
  for (const texto of ['Vou entender prioridades', 'Quero ajudar', 'Explicarei os riscos']) s = responder(s, texto);
  assert.equal(s.estado, 'concluida');
  assert.equal(s.eventos.length, 3);
  assert.equal(obterCena(s), null);
  const resumo = criarResumo(s);
  assert.equal(resumo.respostas.length, 3);
  assert.equal('talentos' in resumo, false);
  assert.ok(s.eventos.every(evento => evento.speaker === 'participant' && evento.is_real_work_history === false));
});

test('não aceita resposta vazia e mantém a sessão original', () => {
  const s = iniciarSimulacao();
  assert.throws(() => responder(s, '   '), /Resposta inválida/);
  assert.equal(s.eventos.length, 0);
});

test('não permite responder após conclusão ou encerramento', () => {
  const s = encerrarSimulacao(iniciarSimulacao());
  assert.throws(() => responder(s, 'teste'), /encerrada/);
});

test('não permite cenário desconhecido', () => {
  assert.throws(() => iniciarSimulacao('inexistente'), /desconhecido/);
  assert.equal(CENARIOS['entrega-sob-pressao'].cenas.length, 3);
});

test('transcrição da simulação permanece separada de histórias reais', () => {
  let s = iniciarSimulacao();
  s = responder(s, 'Eu faria uma lista das tarefas.');
  const resumo = criarResumo(s);
  assert.equal(resumo.origem, 'office_simulation');
  assert.equal(resumo.respostas[0].citacao, 'Eu faria uma lista das tarefas.');
  assert.match(resumo.aviso, /fictícia/);
});

test('avança briefing → colega → atualizacao → concluida, registrando cada cena', () => {
  let s = iniciarSimulacao();
  const fases = [obterFase(s)];
  for (const texto of ['a', 'b', 'c']) { s = responder(s, texto); fases.push(obterFase(s)); }
  assert.deepEqual(fases, ['briefing', 'colega', 'atualizacao', 'concluida']);
  assert.deepEqual(s.eventos.map(e => [e.scene_id, e.scenario_id, e.origem]), [
    ['briefing', 'entrega-sob-pressao', 'office_simulation'],
    ['colega', 'entrega-sob-pressao', 'office_simulation'],
    ['atualizacao', 'entrega-sob-pressao', 'office_simulation'],
  ]);
});

test('falas dos NPCs nunca entram nos eventos do participante', () => {
  let s = iniciarSimulacao();
  s = responder(s, 'minha resposta');
  const falasNpc = CENARIOS['entrega-sob-pressao'].cenas.map(c => c.fala);
  assert.ok(s.eventos.every(e => !falasNpc.includes(e.quote)));
});
