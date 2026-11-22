import { CAMINHOS, TEMA_DOMINIO, AVISO_PADRAO } from './catalogo.js';

/**
 * Parseia transcrição simples com prefixos PESSOA: e LIA:. Uma fala corresponde a
 * um bloco até o próximo prefixo. Para produção, usar segmentos autenticados
 * da API de transcrição, não rótulos fornecidos pelo usuário.
 */
export function extrairFalas(transcricao) {
  if (typeof transcricao !== 'string') throw new TypeError('Transcrição inválida');
  const falas = [];
  const linhas = transcricao.replace(/\r\n?/g, '\n').split('\n');
  for (const linha of linhas) {
    const marcacao = linha.match(/^\s*(PESSOA|LIA):\s*(.*)$/i);
    if (marcacao) {
      falas.push({ autor: marcacao[1].toUpperCase(), texto: marcacao[2] });
    } else if (falas.length) {
      falas[falas.length - 1].texto += '\n' + linha;
    }
  }
  return falas.filter(fala => fala.texto.trim());
}

function partesDaCitacao(citacao) {
  if (typeof citacao !== 'string') return [];
  const texto = citacao.trim();
  if (!texto || texto.split(/\s+/).length > 25) return [];
  const partes = texto.split('...').map(s => s.trim());
  // Impede passar reticências soltas, início/fim vazio ou fragmentos de uma letra.
  if (partes.some(parte => parte.length < 3)) return [];
  return partes;
}

function existeNaFala(citacao, fala) {
  const partes = partesDaCitacao(citacao);
  if (!partes.length) return false;
  let pos = 0;
  for (const parte of partes) {
    const indice = fala.indexOf(parte, pos);
    if (indice === -1) return false;
    pos = indice + parte.length;
  }
  return true;
}

/**
 * Valida e reduz um relatório de LLM. Nunca utilizar a resposta original do LLM
 * para liberar compartilhamento ou mostrar evidências sem passar por esta função.
 * @param {unknown} relatorio
 * @param {string} transcricao
 * @returns {{ valido: boolean, compartilhamento_permitido: boolean, elegivel_para_compartilhamento: boolean, erros: string[], relatorio: object|null }}
 */
export function validarRelatorio(relatorio, transcricao) {
  const erros = [];
  if (!relatorio || typeof relatorio !== 'object' || Array.isArray(relatorio)) {
    return { valido: false, compartilhamento_permitido: false, elegivel_para_compartilhamento: false, erros: ['JSON raiz inválido'], relatorio: null };
  }
  let falas;
  try {
    falas = extrairFalas(transcricao).filter(fala => fala.autor === 'PESSOA');
  } catch {
    return { valido: false, compartilhamento_permitido: false, elegivel_para_compartilhamento: false, erros: ['Transcrição inválida'], relatorio: null };
  }
  if (!falas.length) erros.push('Nenhuma fala da pessoa na transcrição');

  // Por segurança, sinalizamos erro se o modelo não informou um booleano.
  if (typeof relatorio.alerta_bem_estar !== 'boolean') erros.push('alerta_bem_estar ausente ou inválido');
  const alerta = relatorio.alerta_bem_estar === true;
  const talentos = [];
  const temasUtilizados = new Set();

  for (const talento of (Array.isArray(relatorio.talentos) ? relatorio.talentos : []).slice(0, 16)) {
    if (!talento || typeof talento !== 'object' || Array.isArray(talento)) continue;
    const dominioEsperado = TEMA_DOMINIO[talento.tema];
    if (!dominioEsperado || dominioEsperado !== talento.dominio || temasUtilizados.has(talento.tema)) {
      erros.push(`Tema/domínio não reconhecido ou repetido: ${String(talento.tema)}`);
      continue;
    }
    temasUtilizados.add(talento.tema);
    const usadas = new Set();
    const idsDeFalas = new Set();
    const evidencias = [];
    for (const e of (Array.isArray(talento.evidencias) ? talento.evidencias : []).slice(0, 20)) {
      const citacao = typeof e === 'string' ? e.trim() : '';
      if (!partesDaCitacao(citacao).length || usadas.has(citacao)) {
        erros.push(`Citação vazia, longa ou duplicada em ${talento.tema}`);
        continue;
      }
      // Uma evidência só por fala, reduz a contagem duplicada de um mesmo relato.
      const idx = falas.findIndex((fala, i) => !idsDeFalas.has(i) && existeNaFala(citacao, fala.texto));
      if (idx === -1) {
        erros.push(`Citação não verificável ou da mesma fala em ${talento.tema}`);
        continue;
      }
      usadas.add(citacao);
      idsDeFalas.add(idx);
      evidencias.push(citacao);
    }
    if (evidencias.length < 2) {
      erros.push(`Tema descartado por falta de 2 evidências: ${talento.tema}`);
      continue;
    }
    talentos.push({
      tema: talento.tema,
      dominio: dominioEsperado,
      confianca: evidencias.length >= 3 ? 'Forte' : 'Moderado',
      evidencias,
      frase: typeof talento.frase === 'string' ? talento.frase.slice(0, 300) : '',
      // 'pontos' omitidos: a qualidade semântica da história não é auditada pelo parser.
    });
  }
  // Valida também a citação usada na atribuição dos caminhos de interesse.
  const caminhos = [];
  for (const item of (Array.isArray(relatorio.caminhos) ? relatorio.caminhos : []).slice(0, 6)) {
    if (!item || !CAMINHOS.includes(item.caminho) || caminhos.some(c => c.caminho === item.caminho)) continue;
    const citacao = typeof item.evidencia === 'string' ? item.evidencia.trim() : '';
    if (falas.some(fala => existeNaFala(citacao, fala.texto))) {
      caminhos.push({ caminho: item.caminho, evidencia: citacao });
    } else {
      erros.push(`Citação de caminho não verificável: ${item.caminho}`);
    }
  }
  const exibivel = {
    nome: typeof relatorio.nome === 'string' ? relatorio.nome.slice(0, 120) : '',
    funcao_atual: typeof relatorio.funcao_atual === 'string' ? relatorio.funcao_atual.slice(0, 120) : null,
    talentos: talentos.slice(0, 3),
    caminhos: caminhos.slice(0, 2),
    // Evita exibir recomendações e interpretações livres sem revisão humana.
    trilhas_sugeridas: [],
    em_descoberta: TEMA_DOMINIO[relatorio.em_descoberta?.tema] ? {
      tema: relatorio.em_descoberta.tema,
      convite: typeof relatorio.em_descoberta.convite === 'string' ? relatorio.em_descoberta.convite.slice(0, 240) : '',
    } : null,
    alerta_bem_estar: alerta,
    aviso: AVISO_PADRAO,
  };
  // NUNCA autorizar compartilhamento só pelo relatório: exige opt-in autenticado
  // numa operação separada do backend. Elegibilidade não é permissão.
  return {
    valido: erros.length === 0,
    compartilhamento_permitido: false,
    elegivel_para_compartilhamento: !alerta && typeof relatorio.alerta_bem_estar === 'boolean' && falas.length > 0,
    erros,
    relatorio: alerta ? null : exibivel,
  };
}
