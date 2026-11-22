import type { ReportDocument, TalentoValidado, CaminhoValidado } from '@/lib/domain/report';
import { codigoDocumento, formatarData, buildIntro } from '@/lib/domain/report';
import { TEMA_POR_NOME, DOMINIO_INFO, CAMINHO_INFO, AVISO_PADRAO, AVISO_DECISAO } from '@/lib/domain/catalogo';
import { DEMO_LABEL } from '@/lib/demo/fixtures';
import { AsciiFingerprint, AsciiDivider } from '@/components/ascii';

export function DemoTag({ className }: { className?: string }) {
  return <span className={`tag tag-demo ${className ?? ''}`}><span className="dot" aria-hidden="true" />{DEMO_LABEL}</span>;
}

export function ConfidenceTag({ t }: { t: TalentoValidado }) {
  const n = t.evidencias.length;
  return (
    <span className={`tag ${t.confianca === 'Forte' ? 'tag-signal' : ''}`}>
      {t.confianca} · {n} evidências
    </span>
  );
}

/* --------------------------------- CAPA ---------------------------------- */
export function ReportCover({ doc }: { doc: ReportDocument }) {
  const campos: [string, string][] = [
    ['Pessoa', doc.participantName],
    ['Projeto', doc.projectName],
    ...(doc.clientName ? ([['Organização', doc.clientName]] as [string, string][]) : []),
    ['Data', formatarData(doc.createdAt)],
    ['Documento', codigoDocumento(doc.id)],
  ];
  return (
    <header aria-labelledby="capa-nome" className="border-b-2 border-ink">
      <div className="shell pb-[clamp(40px,6vw,88px)] pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-3">
          <p className="meta">Mapa de Talentos <span aria-hidden="true">/</span> Documento pessoal <span aria-hidden="true">/</span> Privado</p>
          {doc.kind === 'demo' ? <DemoTag /> : <span className="meta meta-soft">{codigoDocumento(doc.id)}</span>}
        </div>
        <div className="grid-12 mt-[clamp(32px,6vw,80px)] gap-y-10">
          <div className="col-span-4 md:col-span-8 lg:col-span-7">
            <p className="display-xl">Mapa de<br />Talentos</p>
            <h1 id="capa-nome" className="display-l mt-[clamp(28px,5vw,64px)] max-w-[16ch] break-words">
              <span className="mark">{doc.participantName}</span>
            </h1>
            {doc.relatorio?.funcao_atual && <p className="lede mt-4 text-ink-soft">{doc.relatorio.funcao_atual}</p>}
          </div>
          <div className="col-span-4 md:col-span-8 lg:col-span-5">
            <figure className="m-0">
              <div className="panel overflow-hidden bg-paper p-5">
                <AsciiFingerprint id={doc.id} cols={36} rows={14} className="text-[clamp(9px,1.4vw,13px)] leading-[1.05]" />
              </div>
              <figcaption className="meta meta-soft mt-2">Composição única deste documento · gerada a partir do identificador, sem dados pessoais</figcaption>
            </figure>
            <dl className="mt-8 border-t-2 border-ink">
              {campos.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[120px_1fr] gap-4 border-b border-ink py-3">
                  <dt className="meta pt-0.5">{k}</dt>
                  <dd className="break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </header>
  );
}

/* --------------------------------- ÍNDICE --------------------------------- */
export function ReportIndex({ doc }: { doc: ReportDocument }) {
  const r = doc.relatorio!;
  const itens = [
    ['01', 'Seu mapa', '#seu-mapa', 'Introdução'],
    ['02', 'Seus talentos', '#seus-talentos', r.talentos.length === 0 ? 'Ainda sem evidência suficiente' : `${r.talentos.length} de até 3`],
    ['03', 'Seus caminhos', '#seus-caminhos', r.caminhos.length === 0 ? 'Nenhum sustentado' : `${r.caminhos.length} de até 2`],
    ['04', 'Ainda em descoberta', '#em-descoberta', r.em_descoberta?.tema ?? '—'],
    ['05', 'Sobre este documento', '#sobre', 'Método e limites'],
  ];
  return (
    <nav aria-label="Índice do documento" className="shell py-[clamp(40px,6vw,72px)]">
      <p className="meta meta-soft mb-4">Índice</p>
      <ol className="border-t-2 border-ink">
        {itens.map(([n, t, href, d]) => (
          <li key={n} className="border-b border-ink">
            <a href={href} className="group grid min-h-[60px] grid-cols-[48px_1fr] items-center gap-x-4 py-3 no-underline sm:grid-cols-[64px_1fr_auto]">
              <span className="font-mono text-lg">{n}</span>
              <span className="font-display text-xl font-medium group-hover:underline sm:text-2xl">{t}</span>
              <span className="meta meta-soft col-start-2 sm:col-start-3 sm:text-right">{d}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ---------------------------- 01 / SEU MAPA ------------------------------ */
export function ChapterIntro({ doc }: { doc: ReportDocument }) {
  const [abertura, ...resto] = buildIntro(doc);
  return (
    <section id="seu-mapa" aria-labelledby="seu-mapa-title" className="scroll-mt-4">
      <AsciiDivider label="01 / Seu mapa" seed={5} />
      <div className="shell grid-12 gap-y-8 py-[clamp(56px,8vw,120px)]">
        <h2 id="seu-mapa-title" className="display-xl col-span-4 md:col-span-8 lg:col-span-4">Seu<br />mapa</h2>
        <div className="col-span-4 md:col-span-8 lg:col-span-7 lg:col-start-6">
          <p className="display-m">{abertura}</p>
          {resto.map(p => <p key={p} className="body-ed mt-6 text-lg">{p}</p>)}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- 02 / SEUS TALENTOS -------------------------- */
export function TalentBlock({ t, i }: { t: TalentoValidado; i: number }) {
  const info = TEMA_POR_NOME[t.tema];
  const dom = DOMINIO_INFO[t.dominio];
  return (
    <article aria-labelledby={`talento-${i}`} className="border-t-2 border-ink py-[clamp(40px,6vw,80px)]">
      <div className="grid-12 gap-y-8">
        <div className="col-span-4 md:col-span-8 lg:col-span-4">
          <p className="font-mono text-[clamp(3rem,7vw,5.5rem)] leading-none tracking-[-0.05em]" aria-hidden="true">02.{i + 1}</p>
          <p className="meta mt-6">{dom?.numero} · {t.dominio}</p>
          <h3 id={`talento-${i}`} className="display-l mt-2">{t.tema}</h3>
          <div className="mt-4"><ConfidenceTag t={t} /></div>
        </div>
        <div className="col-span-4 md:col-span-8 lg:col-span-8">
          {t.frase && (
            <div>
              <p className="display-m">{t.frase}</p>
              <p className="meta meta-soft mt-2">Leitura do analista, apoiada nas evidências abaixo</p>
            </div>
          )}
          {info && <p className="body-ed mt-6 text-ink-soft"><strong className="text-ink">O que este talento descreve.</strong> {info.essencia} {info.noTrabalho}</p>}
          <ol className="mt-8 space-y-4" aria-label={`Evidências de ${t.tema}`}>
            {t.evidencias.map((e, k) => (
              <li key={k}>
                <p className="meta mb-2">Evidência {k + 1} · fala literal</p>
                <blockquote className={`quote m-0 ${k === 0 ? 'quote-signal' : ''}`}>{e}</blockquote>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </article>
  );
}

export function ChapterTalents({ doc }: { doc: ReportDocument }) {
  const talentos = doc.relatorio!.talentos;
  return (
    <section id="seus-talentos" aria-labelledby="talentos-title" className="scroll-mt-4">
      <AsciiDivider label="02 / Seus talentos" seed={8} />
      <div className="shell pt-[clamp(56px,8vw,120px)]">
        <div className="grid-12 gap-y-6 pb-[clamp(32px,5vw,64px)]">
          <h2 id="talentos-title" className="display-xl col-span-4 md:col-span-8 lg:col-span-7">Seus<br />talentos</h2>
          <p className="col-span-4 md:col-span-8 lg:col-span-4 lg:col-start-9 self-end text-ink-soft">
            Um talento só aparece aqui quando pelo menos duas falas diferentes suas o sustentam. <strong className="text-ink">Forte</strong>: três ou mais evidências. <strong className="text-ink">Moderado</strong>: duas.
          </p>
        </div>
        {talentos.length === 0 ? (
          <div className="border-t-2 border-ink py-[clamp(40px,6vw,80px)]">
            <div className="panel max-w-[760px] p-[clamp(24px,4vw,48px)]">
              <p className="meta">Resultado parcial</p>
              <p className="display-m mt-4">Nenhum talento teve evidência suficiente — ainda.</p>
              <p className="body-ed mt-4 text-ink-soft">
                Isso acontece quando a conversa é curta ou quando as respostas ficam no geral, como “sou esforçado”. Não é uma avaliação sobre você. Histórias específicas — um dia, uma situação, o que você fez — são o que dá forma ao mapa.
              </p>
            </div>
          </div>
        ) : (
          talentos.map((t, i) => <TalentBlock key={t.tema} t={t} i={i} />)
        )}
      </div>
    </section>
  );
}

/* --------------------------- 03 / SEUS CAMINHOS -------------------------- */
function PathBlock({ c, i }: { c: CaminhoValidado; i: number }) {
  return (
    <article className="panel flex flex-col p-6">
      <p className="meta">03.{i + 1} · Caminho</p>
      <h3 className="display-m mt-3">{c.caminho}</h3>
      <p className="mt-2 text-ink-soft">Para quem gosta de: {CAMINHO_INFO[c.caminho]?.gosta.toLowerCase()}.</p>
      <p className="meta mb-2 mt-6">Evidência · fala literal</p>
      <blockquote className="quote m-0 mt-auto">{c.evidencia}</blockquote>
    </article>
  );
}

export function ChapterPaths({ doc }: { doc: ReportDocument }) {
  const caminhos = doc.relatorio!.caminhos;
  return (
    <section id="seus-caminhos" aria-labelledby="caminhos-title" className="scroll-mt-4 border-t-2 border-ink bg-surface">
      <div className="shell py-[clamp(56px,8vw,120px)]">
        <p className="meta meta-soft text-center">03 / Seus caminhos</p>
        <h2 id="caminhos-title" className="display-xl mt-4 text-center">Seus caminhos</h2>
        <p className="mx-auto mt-6 max-w-[56ch] text-center text-ink-soft">
          Interesses que apareceram nas suas respostas. São possibilidades para conversar, não uma recomendação. {AVISO_DECISAO}
        </p>
        {caminhos.length === 0 ? (
          <p className="panel mx-auto mt-12 max-w-[640px] p-6 text-center">Nenhum caminho teve uma fala que o sustentasse com segurança nesta conversa.</p>
        ) : (
          <div className={`mx-auto mt-12 grid max-w-[1040px] gap-6 ${caminhos.length > 1 ? 'md:grid-cols-2' : 'max-w-[560px]'}`}>
            {caminhos.map((c, i) => <PathBlock key={c.caminho} c={c} i={i} />)}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------- 04 / AINDA EM DESCOBERTA ---------------------- */
export function ChapterDiscovery({ doc }: { doc: ReportDocument }) {
  const d = doc.relatorio!.em_descoberta;
  const info = d ? TEMA_POR_NOME[d.tema] : null;
  return (
    <section id="em-descoberta" aria-labelledby="descoberta-title" className="scroll-mt-4 border-t-2 border-ink">
      <div className="shell grid-12 gap-y-8 py-[clamp(56px,8vw,120px)]">
        <div className="col-span-4 md:col-span-8 lg:col-span-5">
          <p className="meta meta-soft">04 / Ainda em descoberta</p>
          <h2 id="descoberta-title" className="display-xl mt-4">Ainda em<br />descoberta</h2>
        </div>
        <div className="col-span-4 md:col-span-8 lg:col-span-6 lg:col-start-7">
          {d && info ? (
            <>
              <p className="meta">{DOMINIO_INFO[info.dominio]?.numero} · {info.dominio}</p>
              <p className="display-l mt-2">{d.tema}</p>
              <p className="body-ed mt-4 text-ink-soft">{info.essencia}</p>
              {d.convite && (
                <div className="callout mt-8">
                  <p className="meta mb-2">Um convite</p>
                  <p className="display-m">{d.convite}</p>
                </div>
              )}
            </>
          ) : (
            <p className="display-m">Outros temas podem aparecer numa próxima conversa.</p>
          )}
          <p className="small mt-8 text-ink-soft">
            Ainda em descoberta não é fraqueza nem ausência de capacidade. Quer dizer só que esta conversa não trouxe histórias suficientes sobre isso.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------- 05 / SOBRE ESTE DOCUMENTO --------------------- */
export function ChapterAbout({ doc, ttlDays }: { doc: ReportDocument; ttlDays: number }) {
  return (
    <section id="sobre" aria-labelledby="sobre-title" className="scroll-mt-4 border-t-2 border-ink bg-paper">
      <AsciiDivider label="05 / Sobre este documento" seed={13} />
      <div className="shell py-[clamp(56px,8vw,120px)]">
        <h2 id="sobre-title" className="display-l max-w-[18ch]">Sobre este documento</h2>
        <div className="mt-10 grid gap-0 border-t-2 border-ink md:grid-cols-3">
          <div className="border-b-2 border-ink py-6 md:border-r-2 md:pr-8">
            <p className="meta">Metodologia</p>
            <p className="small mt-3">
              A Lia conduz a conversa e não pontua nada. Um segundo agente propõe talentos a partir da transcrição. Um validador automático confere cada citação contra as falas da pessoa — nunca as da Lia —, exige duas falas diferentes por talento e define a confiança pela contagem.
              {doc.descartes > 0 && <> Nesta conversa, o validador descartou {doc.descartes} {doc.descartes === 1 ? 'item proposto' : 'itens propostos'} sem evidência verificável.</>}
            </p>
          </div>
          <div className="border-b-2 border-ink py-6 md:border-r-2 md:px-8">
            <p className="meta">Limitações</p>
            <p className="small mt-3">
              O catálogo se inspira em dimensões de personalidade (Big Five) e interesses (RIASEC), mas não é um teste psicológico validado. Uma citação literal não prova que o relato é verdadeiro, nem que a leitura está certa. Falas diferentes podem falar do mesmo episódio.
            </p>
          </div>
          <div className="border-b-2 border-ink py-6 md:pl-8">
            <p className="meta">Privacidade</p>
            <p className="small mt-3">
              {doc.kind === 'demo'
                ? 'Este é um documento de demonstração, gerado a partir de uma conversa sintética. Nenhum dado pessoal foi coletado ou armazenado.'
                : `Este documento é privado e não foi enviado a nenhuma empresa. Ele guarda apenas o resultado validado — não a transcrição — e expira em até ${ttlDays} dias. Compartilhar com uma organização exige autorização específica, ainda não disponível nesta versão.`}
            </p>
          </div>
        </div>
        <div className="on-signal mt-10 border-2 border-on-signal bg-signal p-6 text-on-signal">
          <p className="meta">Aviso</p>
          <p className="display-m mt-2">{AVISO_PADRAO}</p>
        </div>
      </div>
    </section>
  );
}
