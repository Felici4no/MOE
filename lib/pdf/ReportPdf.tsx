import 'server-only';
import path from 'node:path';
import { Document, Page, Text, View, Font, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { ReportDocument, TalentoValidado } from '@/lib/domain/report';
import { buildIntro, codigoDocumento, formatarData } from '@/lib/domain/report';
import { TEMA_POR_NOME, DOMINIO_INFO, CAMINHO_INFO, AVISO_PADRAO, AVISO_DECISAO } from '@/lib/domain/catalogo';
import { fingerprint, staticField, dividerPattern } from '@/lib/ascii/core';
import { DEMO_LABEL } from '@/lib/demo/fixtures';

/* Tokens compartilhados com a web (app/globals.css). */
export const PDF_TOKENS = {
  paper: '#F5F2E9', ink: '#111111', surface: '#FFFFFF', muted: '#E7E2D7',
  signal: '#F8D94B', green: '#B8E986', soft: '#3D3A33', faint: '#8A847A',
};
const C = PDF_TOKENS;

let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  const dir = path.join(process.cwd(), 'assets', 'fonts');
  Font.register({ family: 'Grotesk', fonts: [
    { src: path.join(dir, 'SpaceGrotesk_500Medium.ttf'), fontWeight: 500 },
    { src: path.join(dir, 'SpaceGrotesk_700Bold.ttf'), fontWeight: 700 },
  ] });
  Font.register({ family: 'Instrument', fonts: [
    { src: path.join(dir, 'InstrumentSans_400Regular.ttf'), fontWeight: 400 },
    { src: path.join(dir, 'InstrumentSans_400Regular_Italic.ttf'), fontWeight: 400, fontStyle: 'italic' },
    { src: path.join(dir, 'InstrumentSans_600SemiBold.ttf'), fontWeight: 600 },
  ] });
  Font.register({ family: 'Plex', fonts: [
    { src: path.join(dir, 'IBMPlexMono-Regular.woff'), fontWeight: 400 },
    { src: path.join(dir, 'IBMPlexMono-Medium.woff'), fontWeight: 500 },
  ] });
  // Português: sem hifenização automática (a padrão é em inglês).
  Font.registerHyphenationCallback(word => [word]);
  fontsReady = true;
}

// Sem ligaduras: o texto copiado do PDF precisa ser idêntico à fala ("fi" não vira um glifo único).
const NO_LIGA = { liga: false, clig: false, dlig: false };

const s = StyleSheet.create({
  cover: { backgroundColor: C.paper, padding: 44, fontFamily: 'Instrument', color: C.ink, fontFeatureSettings: NO_LIGA },
  page: { backgroundColor: C.surface, paddingTop: 76, paddingBottom: 70, paddingHorizontal: 52, fontFamily: 'Instrument', fontSize: 10.5, lineHeight: 1.5, color: C.ink, fontFeatureSettings: NO_LIGA },
  meta: { fontFamily: 'Plex', fontSize: 7.5, letterSpacing: 0.8, textTransform: 'uppercase' },
  rule: { borderTopWidth: 1.5, borderTopColor: C.ink },
  ruleThin: { borderTopWidth: 0.75, borderTopColor: C.ink },
  h1: { fontFamily: 'Grotesk', fontWeight: 700, fontSize: 58, lineHeight: 0.92, letterSpacing: -2, textTransform: 'uppercase' },
  h2: { fontFamily: 'Grotesk', fontWeight: 700, fontSize: 30, lineHeight: 1, letterSpacing: -1 },
  h3: { fontFamily: 'Grotesk', fontWeight: 700, fontSize: 20, lineHeight: 1.1, letterSpacing: -0.5 },
  lead: { fontFamily: 'Grotesk', fontWeight: 500, fontSize: 14, lineHeight: 1.3 },
  soft: { color: C.soft },
  ascii: { fontFamily: 'Plex', fontSize: 6.6, lineHeight: 1.05, color: C.ink },
  header: { position: 'absolute', top: 30, left: 52, right: 52, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 6, borderBottomWidth: 1.5, borderBottomColor: C.ink },
  footer: { position: 'absolute', top: 800, left: 52, right: 52, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 0.75, borderTopColor: C.ink },
  chapter: { flexDirection: 'row', alignItems: 'center', marginTop: 26, marginBottom: 16 },
  chapterLabel: { backgroundColor: C.ink, color: C.paper, paddingVertical: 4, paddingHorizontal: 8 },
  quote: { borderWidth: 1.5, borderColor: C.ink, paddingVertical: 8, paddingHorizontal: 12, marginTop: 6, fontSize: 11, lineHeight: 1.45 },
  tag: { borderWidth: 1, borderColor: C.ink, paddingVertical: 2, paddingHorizontal: 6, alignSelf: 'flex-start' },
});

function Chapter({ n, title }: { n: string; title: string }) {
  return (
    <View style={s.chapter} minPresenceAhead={120} wrap={false}>
      <Text style={[s.meta, s.chapterLabel]}>{n} / {title}</Text>
      <Text style={[s.ascii, { color: C.faint, marginLeft: 6, fontSize: 7 }]}>{dividerPattern(70, Number(n) * 7)}</Text>
    </View>
  );
}

function Talent({ t, i }: { t: TalentoValidado; i: number }) {
  const info = TEMA_POR_NOME[t.tema];
  return (
    // wrap={false}: o bloco do talento e suas citações nunca se dividem entre páginas.
    <View wrap={false} style={{ borderTopWidth: 1.5, borderTopColor: C.ink, paddingTop: 12, marginBottom: 18, flexDirection: 'row' }}>
      <View style={{ width: 150, paddingRight: 14 }}>
        <Text style={{ fontFamily: 'Plex', fontSize: 26, lineHeight: 1.1, letterSpacing: -1 }}>02.{i + 1}</Text>
        <Text style={[s.meta, { marginTop: 8 }]}>{DOMINIO_INFO[t.dominio]?.numero} · {t.dominio}</Text>
        <Text style={[s.h3, { marginTop: 4 }]}>{t.tema}</Text>
        <Text style={[s.meta, s.tag, { marginTop: 6, backgroundColor: t.confianca === 'Forte' ? C.signal : C.surface }]}>
          {t.confianca} · {t.evidencias.length} evidências
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        {t.frase ? <Text style={s.lead}>{t.frase}</Text> : null}
        {t.frase ? <Text style={[s.meta, s.soft, { marginTop: 3 }]}>Leitura do analista, apoiada nas evidências</Text> : null}
        {info ? <Text style={[s.soft, { marginTop: 6 }]}>{info.essencia} {info.noTrabalho}</Text> : null}
        {t.evidencias.map((e, k) => (
          <View key={k} style={{ marginTop: 8 }}>
            <Text style={s.meta}>Evidência {k + 1} · fala literal</Text>
            <Text style={[s.quote, k === 0 ? { backgroundColor: C.signal } : {}]}>“{e}”</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ReportPdf({ doc }: { doc: ReportDocument }) {
  const r = doc.relatorio!;
  const fp = fingerprint(doc.id, 46, 16);
  const field = staticField(92, 5, 23);
  const intro = buildIntro(doc);
  const campos: [string, string][] = [
    ['Pessoa entrevistada', doc.participantName],
    ['Projeto', doc.projectName],
    ...(doc.clientName ? ([['Cliente / organização', doc.clientName]] as [string, string][]) : []),
    ['Data de geração', formatarData(doc.createdAt)],
    ['Identificador', codigoDocumento(doc.id)],
  ];

  return (
    <Document title={`Mapa de Talentos — ${doc.participantName}`} author="Mapa de Talentos" subject="Documento pessoal de autoconhecimento" language="pt-BR" creator="Mapa de Talentos" producer="Mapa de Talentos">
      {/* ------------------------------- CAPA ------------------------------ */}
      <Page size="A4" style={s.cover}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1.5, borderBottomColor: C.ink, paddingBottom: 6 }}>
          <Text style={s.meta}>Mapa de Talentos / Documento pessoal / Privado</Text>
          <Text style={s.meta}>{codigoDocumento(doc.id)}</Text>
        </View>
        {doc.kind === 'demo' && (
          <Text style={[s.meta, { marginTop: 10, alignSelf: 'flex-start', borderWidth: 1, borderStyle: 'dashed', borderColor: C.ink, backgroundColor: C.muted, paddingVertical: 3, paddingHorizontal: 6 }]}>
            {DEMO_LABEL} — nenhuma pessoa real
          </Text>
        )}
        <Text style={[s.h1, { marginTop: 34 }]}>Mapa de{'\n'}Talentos</Text>
        <View style={{ marginTop: 26 }}>
          {fp.map((l, i) => <Text key={i} style={s.ascii}>{l}</Text>)}
        </View>
        <View style={{ marginTop: 24, backgroundColor: C.signal, borderWidth: 1.5, borderColor: C.ink, paddingVertical: 12, paddingHorizontal: 14 }}>
          <Text style={[s.meta, { marginBottom: 4 }]}>Pessoa entrevistada</Text>
          <Text style={{ fontFamily: 'Grotesk', fontWeight: 700, fontSize: 28, lineHeight: 1.05, letterSpacing: -0.8 }}>{doc.participantName}</Text>
          {r.funcao_atual ? <Text style={{ marginTop: 4, fontSize: 12 }}>{r.funcao_atual}</Text> : null}
        </View>
        <View style={{ marginTop: 22 }}>
          {campos.map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', borderTopWidth: 0.75, borderTopColor: C.ink, paddingVertical: 5 }}>
              <Text style={[s.meta, { width: 150, paddingTop: 1.5 }]}>{k}</Text>
              <Text style={{ flex: 1, fontSize: 11 }}>{v}</Text>
            </View>
          ))}
          <View style={s.ruleThin} />
        </View>
        <View style={{ position: 'absolute', bottom: 40, left: 44, right: 44 }}>
          {field.map((l, i) => <Text key={i} style={[s.ascii, { color: C.faint, fontSize: 5.6 }]}>{l}</Text>)}
          <Text style={[s.meta, { marginTop: 8 }]}>Ferramenta de autoconhecimento. Não é teste psicológico.</Text>
        </View>
      </Page>

      {/* ----------------------------- CONTEÚDO ---------------------------- */}
      <Page size="A4" style={s.page} wrap>
        <View style={s.header} fixed>
          <Text style={s.meta}>Mapa de Talentos · {doc.participantName}</Text>
          <Text style={s.meta}>{doc.kind === 'demo' ? 'Demonstração · dados sintéticos' : codigoDocumento(doc.id)}</Text>
        </View>
        <View style={s.footer} fixed>
          <Text style={s.meta}>{codigoDocumento(doc.id)} · {formatarData(doc.createdAt)}</Text>
          <Text style={s.meta} render={({ pageNumber, totalPages }) => `${String(pageNumber).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`} />
        </View>

        <Text style={[s.meta, s.soft]}>Índice</Text>
        <View style={{ marginTop: 6, marginBottom: 6 }}>
          {[
            ['01', 'Seu mapa'],
            ['02', `Seus talentos (${r.talentos.length})`],
            ['03', `Seus caminhos (${r.caminhos.length})`],
            ['04', 'Ainda em descoberta'],
            ['05', 'Sobre este documento'],
          ].map(([n, t]) => (
            <View key={n} style={{ flexDirection: 'row', borderTopWidth: 0.75, borderTopColor: C.ink, paddingVertical: 4 }}>
              <Text style={{ fontFamily: 'Plex', width: 34 }}>{n}</Text>
              <Text style={{ fontFamily: 'Grotesk', fontWeight: 500, fontSize: 12 }}>{t}</Text>
            </View>
          ))}
          <View style={s.ruleThin} />
        </View>

        <Chapter n="01" title="Seu mapa" />
        <Text style={s.lead}>{intro[0]}</Text>
        {intro.slice(1).map(p => <Text key={p} style={{ marginTop: 8 }}>{p}</Text>)}

        <Chapter n="02" title="Seus talentos" />
        <Text style={[s.soft, { marginBottom: 12 }]}>Um talento só aparece quando pelo menos duas falas diferentes o sustentam. Forte: três ou mais evidências. Moderado: duas.</Text>
        {r.talentos.length === 0 ? (
          <View wrap={false} style={{ borderWidth: 1.5, borderColor: C.ink, padding: 14 }}>
            <Text style={s.meta}>Resultado parcial</Text>
            <Text style={[s.h3, { marginTop: 6 }]}>Nenhum talento teve evidência suficiente — ainda.</Text>
            <Text style={[s.soft, { marginTop: 6 }]}>Isso não é uma avaliação sobre você. Histórias específicas — um dia, uma situação, o que você fez — são o que dá forma ao mapa.</Text>
          </View>
        ) : r.talentos.map((t, i) => <Talent key={t.tema} t={t} i={i} />)}

        <Chapter n="03" title="Seus caminhos" />
        <Text style={[s.soft, { marginBottom: 10 }]}>Interesses que apareceram nas respostas. Possibilidades para conversar, não recomendação. {AVISO_DECISAO}</Text>
        {r.caminhos.length === 0 ? (
          <Text>Nenhum caminho teve uma fala que o sustentasse com segurança nesta conversa.</Text>
        ) : r.caminhos.map((c, i) => (
          <View key={c.caminho} wrap={false} style={{ borderTopWidth: 1.5, borderTopColor: C.ink, paddingTop: 8, marginBottom: 12 }}>
            <Text style={s.meta}>03.{i + 1} · Caminho</Text>
            <Text style={[s.h3, { marginTop: 3 }]}>{c.caminho}</Text>
            <Text style={[s.soft, { marginTop: 2 }]}>Para quem gosta de: {CAMINHO_INFO[c.caminho]?.gosta.toLowerCase()}.</Text>
            <Text style={s.quote}>“{c.evidencia}”</Text>
          </View>
        ))}

        <Chapter n="04" title="Ainda em descoberta" />
        <View wrap={false}>
          {r.em_descoberta ? (
            <>
              <Text style={s.h3}>{r.em_descoberta.tema}</Text>
              <Text style={[s.soft, { marginTop: 4 }]}>{TEMA_POR_NOME[r.em_descoberta.tema]?.essencia}</Text>
              {r.em_descoberta.convite ? (
                <View style={{ borderLeftWidth: 4, borderLeftColor: C.ink, paddingLeft: 10, marginTop: 10 }}>
                  <Text style={s.meta}>Um convite</Text>
                  <Text style={s.lead}>{r.em_descoberta.convite}</Text>
                </View>
              ) : null}
            </>
          ) : <Text style={s.lead}>Outros temas podem aparecer numa próxima conversa.</Text>}
          <Text style={[s.soft, { marginTop: 10 }]}>Ainda em descoberta não é fraqueza nem ausência de capacidade: esta conversa só não trouxe histórias suficientes sobre isso.</Text>
        </View>

        <Chapter n="05" title="Sobre este documento" />
        <View wrap={false}>
          <Text style={s.meta}>Metodologia</Text>
          <Text style={{ marginTop: 3, marginBottom: 8 }}>
            A Lia conduz a conversa e não pontua nada. Um segundo agente propõe talentos a partir da transcrição. Um validador automático confere cada citação contra as falas da pessoa, exige duas falas diferentes por talento e define a confiança pela contagem.{doc.descartes > 0 ? ` Nesta conversa, ${doc.descartes} ${doc.descartes === 1 ? 'item proposto foi descartado' : 'itens propostos foram descartados'} por falta de evidência verificável.` : ''}
          </Text>
          <Text style={s.meta}>Limitações</Text>
          <Text style={{ marginTop: 3, marginBottom: 8 }}>
            O catálogo se inspira em Big Five (IPIP) e RIASEC, mas não é um teste psicológico validado. Uma citação literal não prova que o relato é verdadeiro, nem que a leitura está certa.
          </Text>
          <Text style={s.meta}>Privacidade</Text>
          <Text style={{ marginTop: 3, marginBottom: 12 }}>
            {doc.kind === 'demo'
              ? 'Documento de demonstração gerado a partir de uma conversa sintética. Nenhum dado pessoal foi coletado.'
              : 'Documento privado, não enviado a nenhuma empresa. Compartilhar com uma organização exige autorização específica, separada.'}
          </Text>
          <View style={{ backgroundColor: C.signal, borderWidth: 1.5, borderColor: C.ink, padding: 12 }}>
            <Text style={s.meta}>Aviso</Text>
            <Text style={[s.lead, { fontSize: 12.5, marginTop: 3 }]}>{AVISO_PADRAO}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderReportPdf(doc: ReportDocument): Promise<Buffer> {
  if (!doc.relatorio) throw new Error('Documento sem relatório exibível');
  registerFonts();
  return renderToBuffer(<ReportPdf doc={doc} />);
}

export function pdfFilename(doc: ReportDocument) {
  const slug = doc.participantName.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  return `mapa-de-talentos-${slug || 'documento'}.pdf`;
}
