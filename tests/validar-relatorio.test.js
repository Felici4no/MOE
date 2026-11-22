import test from 'node:test';
import assert from 'node:assert/strict';
import { validarRelatorio, extrairFalas } from '../src/validar-relatorio.js';

const base = {
  nome: 'Ana', funcao_atual: 'Operadora de caixa',
  talentos: [{
    tema: 'Olho Clínico', dominio: 'FAZER ACONTECER', confianca: 'Forte', pontos: 999,
    evidencias: ['Eu vi que o preço estava errado.', 'Eu conferi o troco e avisei.'],
    frase: 'Você percebe detalhes.',
  }],
  caminhos: [{ caminho: 'Organizar e controlar', evidencia: 'Eu conferi o troco e avisei.' }],
  trilhas_sugeridas: ['Estoque'],
  em_descoberta: { tema: 'Faísca', convite: 'Você já teve uma ideia?' },
  alerta_bem_estar: false,
};
const transcricao = 'LIA: Me conte uma história.\nPESSOA: Eu vi que o preço estava errado.\nLIA: Outra história?\nPESSOA: Eu conferi o troco e avisei.';
const copia = () => structuredClone(base);

test('aceita duas citações literais de falas distintas, sem confiar nos pontos do LLM', () => {
  const resultado = validarRelatorio(copia(), transcricao);
  assert.equal(resultado.valido, true);
  assert.equal(resultado.relatorio.talentos[0].confianca, 'Moderado');
  assert.equal('pontos' in resultado.relatorio.talentos[0], false);
  assert.equal(resultado.relatorio.caminhos.length, 1);
  assert.equal(resultado.compartilhamento_permitido, false);
  assert.equal(resultado.elegivel_para_compartilhamento, true);
});

test('descarta citações inventadas ou presentes somente na fala da Lia', () => {
  const r = copia();
  r.talentos[0].evidencias[1] = 'Outra história?';
  const resultado = validarRelatorio(r, transcricao);
  assert.equal(resultado.relatorio.talentos.length, 0);
  assert.ok(resultado.erros.some(erro => erro.includes('descartado')));
});

test('não permite duas evidências da mesma fala, mesmo com frases diferentes', () => {
  const t = 'PESSOA: Eu vi que o preço estava errado. Eu conferi o troco e avisei.';
  const resultado = validarRelatorio(copia(), t);
  assert.equal(resultado.relatorio.talentos.length, 0);
});

test('permite recorte com reticências se ambas as partes aparecerem em ordem na mesma fala', () => {
  const r = copia();
  r.talentos[0].evidencias[0] = 'Eu vi... estava errado.';
  assert.equal(validarRelatorio(r, transcricao).relatorio.talentos.length, 1);
});

test('bloqueia compartilhamento e relatório quando há alerta', () => {
  const r = copia();
  r.alerta_bem_estar = true;
  const resultado = validarRelatorio(r, transcricao);
  assert.equal(resultado.compartilhamento_permitido, false);
  assert.equal(resultado.relatorio, null);
});

test('não inventa talentos com respostas genéricas', () => {
  const r = copia();
  const resultado = validarRelatorio(r, 'PESSOA: Eu sou bem esforçada.\nLIA: E mais?\nPESSOA: Sou organizada.');
  assert.equal(resultado.relatorio.talentos.length, 0);
});

test('não concede autorização para compartilhar sem alerta válido', () => {
  const r = copia();
  delete r.alerta_bem_estar;
  const resultado = validarRelatorio(r, transcricao);
  assert.equal(resultado.compartilhamento_permitido, false);
});

test('preserva falas multilinha e autoria', () => {
  assert.deepEqual(extrairFalas('LIA: oi\nPESSOA: Fui lá\ne resolvi.').map(f => f.autor), ['LIA', 'PESSOA']);
});
