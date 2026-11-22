import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { Wordmark } from "@/components/Wordmark";
import { Arrow, Check, Send, Upload } from "@/components/icons";
import s from "./landing.module.css";

/* Dados de demonstração das telas do produto. Fictícios, marcados como tal em cada moldura. */
const RANK = [
  { n: 1, i: "MA", name: "Marina Alves", c: 94, p: 88, k: 90, fit: 91 },
  { n: 2, i: "RT", name: "Rafael Torres", c: 86, p: 84, k: 82, fit: 84 },
  { n: 3, i: "JS", name: "Juliana Souza", c: 80, p: 85, k: 74, fit: 80 },
  { n: 4, i: "BC", name: "Bruno Costa", c: 72, p: 70, k: 79, fit: 74 },
  { n: 5, i: "LN", name: "Larissa Nunes", c: 70, p: 66, k: 72, fit: 69 },
];
const HIST = [4, 8, 14, 24, 38, 31, 22, 14, 6, 3];

/* Pesquisas públicas citadas na página (verificadas em 22/11/2026). */
const SOURCES = [
  { name: "World Economic Forum", href: "https://www.weforum.org/publications/the-future-of-jobs-report-2025/" },
  { name: "LinkedIn Talent Solutions", href: "https://business.linkedin.com/talent-solutions/resources/future-of-recruiting/archival/future-of-recruiting-2024" },
  { name: "Leadership IQ", href: "https://www.leadershipiq.com/blogs/leadershipiq/35354241-why-new-hires-fail-emotional-intelligence-vs-skills" },
  { name: "SHRM", href: "https://www.shrm.org/content/dam/en/shrm/research/SHRM-Culture-Report_2019.pdf" },
  { name: "CareerBuilder", href: "https://www.shrm.org/topics-tools/news/talent-acquisition/morale-productivity-suffer-bad-hires" },
];

const PLANS = [
  { id: "equipe", name: "Equipe", price: "R$ 890", per: "/mês", pitch: "Para times que abrem poucas vagas por mês.",
    features: ["15 entrevistas por mês", "Cultura e vagas ilimitadas", "Convite em lote por planilha", "Ranking de fit com evidências"],
    cta: { href: "/entrar?modo=cadastro", label: "Começar teste" } },
  { id: "empresa", name: "Empresa", price: "R$ 2.490", per: "/mês", pitch: "Para RH com processos seletivos contínuos.", recommended: true,
    features: ["50 entrevistas por mês", "Tudo do Equipe", "Análises consolidadas por vaga", "Suporte prioritário"],
    cta: { href: "/entrar?modo=cadastro", label: "Começar teste" } },
  { id: "enterprise", name: "Enterprise", price: "Sob consulta", per: "", pitch: "Volume, marca e integrações sob medida.",
    features: ["Volume sob medida", "Integração com ATS sob demanda", "Voz com a sua marca", "SLA, contrato e faturamento dedicado"],
    cta: { href: "/contato", label: "Falar com vendas" } },
];

const FAQ = [
  { q: "O candidato precisa instalar alguma coisa?", a: "Não. Ele abre o link do convite no navegador, cria uma senha e conversa com a Lia usando o microfone. Na sala dá para escolher o microfone e a saída de áudio e testar os dois antes de começar." },
  { q: "Como a IA chega à nota de fit?", a: "A Lia conduz uma entrevista por voz de cerca de 10 minutos sobre histórias reais de trabalho. Depois, a análise compara as falas com os valores da sua cultura, as soft skills e o perfil comportamental da vaga. Cada nota alta precisa de uma frase literal do candidato; sem frase, a nota fica limitada." },
  { q: "Qual planilha posso importar?", a: "Excel (.xlsx) ou CSV com uma coluna de e-mail e, se quiser, uma de nome. O MOE encontra as colunas pelo cabeçalho, ignora e-mails repetidos e mostra as linhas com problema." },
  { q: "O que a empresa vê do candidato?", a: "A análise de fit, os diferenciais e os trechos que sustentam cada nota, e só depois que a pessoa autoriza ao aceitar o convite. A transcrição completa e o áudio ficam com o candidato, que pode retirar a autorização." },
  { q: "O MOE decide quem contratar?", a: "Não. O ranking organiza a conversa do RH e mostra onde aprofundar. A decisão continua sendo das pessoas, com outras etapas do processo." },
  { q: "Posso testar antes de assinar?", a: "Sim. O espaço da empresa vem com 5 convites de teste, sem cartão. Os valores dos planos são de referência e podem mudar." },
];

function RankingShot() {
  return (
    <div className={s.browser} role="img" aria-label="Tela do MOE com o ranking de fit da vaga Analista de Customer Success, com dados fictícios">
      <div className={s.chrome} aria-hidden><i /><i /><i /><span>resona.app/empresa/vagas/cs-pleno</span></div>
      <div className={s.app} aria-hidden>
        <div className={s.appTop}>
          <div><small>Vaga</small><b>Analista de Customer Success</b></div>
          <span className={s.pill}><b>31</b> de 48 concluíram</span>
        </div>
        <div className={s.appBody}>
          <ol className={s.rank}>
            {RANK.map((r) => (
              <li key={r.n} data-top={r.n === 1 || undefined}>
                <span className={s.n}>{r.n}</span><span className={s.av}>{r.i}</span>
                <span className={s.who}><b>{r.name}</b>
                  <span className={s.bars}>{[r.c, r.p, r.k].map((v, j) => <span key={j}><i style={{ width: `${v}%` }} /></span>)}</span>
                </span>
                <span className={s.fit}>{r.fit}</span>
                {r.n === 1 && <span className={s.quote}>Diferencial: <q>eu liguei para cada cliente que cancelou para entender o motivo</q></span>}
              </li>
            ))}
          </ol>
          <div className={s.side}>
            <small>Distribuição do fit</small>
            <div className={s.hist}>{HIST.map((h, j) => <i key={j} data-hi={j >= 8 || undefined} style={{ height: `${(h / 38) * 100}%` }} />)}</div>
            <div className={s.histAxis}><span>0</span><span>50</span><span>100</span></div>
            <p className={s.sideStat}><b>9</b><span>acima de 80</span></p>
          </div>
        </div>
        <p className={s.fict}>Barras: cultura · perfil · soft skills · Dados fictícios</p>
      </div>
    </div>
  );
}

function CultureShot() {
  const values = [["Cliente no centro", "As decisões partem de quem usa o produto."], ["Autonomia e dono", "Cada pessoa age como dona do que faz."], ["Colaboração", "Resultados são construídos em conjunto."]];
  return (
    <div className={s.frame} role="img" aria-label="Valores de cultura extraídos de um documento, com dados fictícios">
      <div className={s.fileRow} aria-hidden><span className={s.fileIcon}>PDF</span><span><b>manifesto-cultura.pdf</b><small>Valores extraídos pela IA</small></span></div>
      <ul className={s.valueList} aria-hidden>
        {values.map(([n, d]) => <li key={n}><b>{n}</b><span>{d}</span></li>)}
      </ul>
      <div className={s.skillRow} aria-hidden>
        {["Comunicação", "Foco no cliente", "Resolução de problemas"].map((k) => <span key={k} className={s.skillOn}><Check />{k}</span>)}
        <span className={s.skillDash}>Negociação</span>
      </div>
      <p className={s.fict}>Exemplo fictício</p>
    </div>
  );
}

function ImportShot() {
  const rows = [["Marina Alves", "marina@exemplo.com", "Convidado"], ["Rafael Torres", "rafael@exemplo.com", "Convidado"], ["Juliana Souza", "juliana@exemplo.com", "Convidado"], ["Bruno Costa", "bruno@exemplo.com", "Na lista"]];
  return (
    <div className={s.frame} role="img" aria-label="Importação de planilha de candidatos e envio de convites em lote, com dados fictícios">
      <div className={s.importHead} aria-hidden>
        <span className={s.fileIcon} data-x>XLS</span>
        <span><b>candidatos-cs.xlsx</b><small>48 adicionados · 2 repetidos ignorados</small></span>
      </div>
      <ul className={s.peopleList} aria-hidden>
        {rows.map(([n, e, st]) => <li key={e}><b>{n}</b><span>{e}</span><em data-on={st === "Convidado" || undefined}>{st}</em></li>)}
      </ul>
      <div className={s.sendRow} aria-hidden><span className={s.fakeBtn}><Send />Enviar 48 convites</span><small>Cada pessoa recebe o link por e-mail</small></div>
      <p className={s.fict}>Exemplo fictício</p>
    </div>
  );
}

function DetailShot() {
  return (
    <div className={s.frame} role="img" aria-label="Análise de um candidato com diferenciais e citações literais, com dados fictícios">
      <div className={s.detailTop} aria-hidden><span className={s.av}>MA</span><span><b>Marina Alves</b><small>Fit geral</small></span><span className={s.big}>91</span></div>
      <div className={s.axesRow} aria-hidden>
        {[["Cultura", 94], ["Perfil", 88], ["Soft skills", 90]].map(([l, v]) => <span key={l}><small>{l}<b>{v}</b></small><i><em style={{ width: `${v}%` }} /></i></span>)}
      </div>
      <ul className={s.diffList} aria-hidden>
        <li><b>Foco no cliente</b><q>eu liguei para cada cliente que cancelou para entender o motivo</q></li>
        <li><b>Autonomia e dono</b><q>ninguém pediu, mas eu montei uma planilha de prioridade</q></li>
      </ul>
      <p className={s.fict}>Exemplo fictício</p>
    </div>
  );
}

export default function Landing() {
  return (
    <>
      <a className={s.skip} href="#conteudo">Pular para o conteúdo</a>
      <SiteHeader />
      <main id="conteudo">
        {/* 2. Abertura */}
        <section className={`${s.wrap} ${s.hero}`} aria-labelledby="hero-title">
          <div className={s.heroCopy}>
            <h1 id="hero-title">Contrate quem combina<br className={s.br} /> com a sua cultura</h1>
            <p className={s.lede}>Descreva a cultura e a vaga, envie a entrevista por voz para todos os candidatos de uma vez e receba o ranking de fit, com a frase de cada pessoa que sustenta a nota.</p>
            <div className={s.actions}>
              <Link className="btn btn-primary btn-lg" href="/entrar?modo=cadastro">Criar espaço da empresa</Link>
              <a className="btn btn-lg" href="#como">Ver como funciona</a>
            </div>
            <p className={s.trust}>
              <span className={s.wave} aria-hidden><i /><i /><i /><i /><i /></span>
              Sem questionário: cada candidato conversa por voz com a Lia
            </p>
            <dl className={s.figures}>
              <div><dt>de conversa por candidato</dt><dd>10 min</dd></div>
              <div><dt>cultura, perfil e soft skills</dt><dd>3 eixos</dd></div>
              <div><dt>para convidar todos de uma vez</dt><dd>1 planilha</dd></div>
            </dl>
          </div>
          <RankingShot />
        </section>

        {/* 3. Faixa de fontes */}
        <section className={`${s.wrap} ${s.sources}`} aria-labelledby="src-title">
          <p id="src-title">Por que comportamento e cultura pesam: dados de pesquisas públicas de RH</p>
          <ul>{SOURCES.map((x) => <li key={x.name}><a href={x.href} target="_blank" rel="noreferrer">{x.name}</a></li>)}</ul>
        </section>

        {/* 4. Recursos */}
        <section id="recursos" className={`${s.wrap} ${s.band}`} aria-labelledby="feat-title">
          <header className={s.bandHead}>
            <h2 id="feat-title">Do documento de cultura ao ranking</h2>
          </header>
          <div className={s.features}>
            <article className={s.feature}>
              <div className={s.featureText}>
                <span className={s.kicker}>Cultura e vaga</span>
                <h3>Sua cultura vira critério, não slogan</h3>
                <p>Suba o manifesto ou cole o texto. A IA extrai os valores, você ajusta. Em cada vaga, escolha as soft skills essenciais e quanto pesa cada traço do perfil comportamental.</p>
                <ul className={s.ticks}><li><Check />PDF, DOCX ou texto</li><li><Check />Sugestão de soft skills pela descrição</li></ul>
              </div>
              <CultureShot />
            </article>
            <article className={s.feature} data-flip>
              <div className={s.featureText}>
                <span className={s.kicker}>Convites em lote</span>
                <h3>Uma planilha, todos os convites</h3>
                <p>Importe o Excel com nome e e-mail. O MOE acha as colunas, ignora repetidos e envia um link para cada candidato criar a conta e começar a entrevista.</p>
                <ul className={s.ticks}><li><Upload />.xlsx ou .csv</li><li><Check />Acompanhe quem aceitou e quem já conversou</li></ul>
              </div>
              <ImportShot />
            </article>
            <article className={s.feature}>
              <div className={s.featureText}>
                <span className={s.kicker}>Ranking e diferenciais</span>
                <h3>Cada nota mostra a frase que a sustenta</h3>
                <p>Veja quem mais se alinha, a distribuição do fit na vaga e os diferenciais de cada pessoa, sempre com trechos literais da entrevista. Sem frase, sem nota alta.</p>
                <ul className={s.ticks}><li><Check />Fit cultural, perfil e soft skills</li><li><Check />O candidato autoriza o que a empresa vê</li></ul>
              </div>
              <DetailShot />
            </article>
          </div>
        </section>

        {/* 5. Processo */}
        <section id="como" className={`${s.wrap} ${s.band}`} aria-labelledby="how-title">
          <header className={s.bandHead}><h2 id="how-title">Como funciona</h2></header>
          <ol className={s.steps}>
            <li><span className={s.stepN}>1</span><h3>Descreva</h3><p>Cultura da empresa uma vez; soft skills e perfil em cada vaga.</p></li>
            <li><span className={s.stepN}>2</span><h3>Convide</h3><p>Importe a planilha e envie a entrevista por voz para todos.</p></li>
            <li><span className={s.stepN}>3</span><h3>Compare</h3><p>Ranking de fit, distribuição e diferenciais com evidência.</p></li>
          </ol>
        </section>

        {/* 6. Evidências */}
        <section className={`${s.wrap} ${s.band}`} aria-labelledby="ev-title">
          <header className={s.bandHead}><h2 id="ev-title">O que as pesquisas dizem</h2></header>
          <figure className={s.bigQuote}>
            <blockquote>
              <p><span className={s.stat}>89%</span> dos fracassos de contratação vêm de atitude, como abertura a feedback, inteligência emocional e motivação. Só 11% vêm de falta de técnica.</p>
            </blockquote>
            <figcaption><span className={s.mono} aria-hidden>LQ</span><span><b>Leadership IQ</b>Estudo com 5.247 gestores de 312 organizações, que acompanhou mais de 20 mil contratações</span></figcaption>
          </figure>
          <div className={s.smallQuotes}>
            <figure>
              <blockquote><p><span className={s.statSm}>67%</span> dos empregadores consideram resiliência, flexibilidade e agilidade uma competência central.</p></blockquote>
              <figcaption><span className={s.mono} aria-hidden>WEF</span><span><b>World Economic Forum</b>Future of Jobs Report 2025</span></figcaption>
            </figure>
            <figure>
              <blockquote><p><span className={s.statSm}>US$ 223 bi</span> foi o custo da rotatividade causada pela cultura de trabalho em cinco anos, nos EUA.</p></blockquote>
              <figcaption><span className={s.mono} aria-hidden>SH</span><span><b>SHRM</b>Culture Report, 2019</span></figcaption>
            </figure>
          </div>
          <p className={s.note}>Números de estudos de terceiros, em contextos diferentes do seu. Não são resultados do MOE.</p>
        </section>

        {/* 7. Planos */}
        <section id="planos" className={`${s.wrap} ${s.band}`} aria-labelledby="plans-title">
          <header className={s.bandHead}>
            <h2 id="plans-title">Planos</h2>
            <p>Comece com 5 convites grátis. Valores de referência, por mês.</p>
          </header>
          <div className={s.plans}>
            {PLANS.map((p) => (
              <article key={p.id} className={s.plan} data-rec={p.recommended || undefined} aria-labelledby={`plan-${p.id}`}>
                <div className={s.planHead}>
                  <h3 id={`plan-${p.id}`}>{p.name}</h3>
                  {p.recommended && <span className={s.rec}>Recomendado</span>}
                </div>
                <p className={s.planPitch}>{p.pitch}</p>
                <p className={s.planPrice}>{p.price}<small>{p.per}</small></p>
                <ul>{p.features.map((f) => <li key={f}><Check />{f}</li>)}</ul>
                <Link className={`btn ${p.recommended ? "btn-primary" : ""}`} href={p.cta.href}>{p.cta.label}</Link>
              </article>
            ))}
          </div>
        </section>

        {/* 8. Dúvidas */}
        <section id="duvidas" className={`${s.wrap} ${s.band} ${s.faqBand}`} aria-labelledby="faq-title">
          <header className={s.bandHead}><h2 id="faq-title">Dúvidas</h2></header>
          <div className={s.faq}>
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}<span aria-hidden /></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 9. Fechamento */}
        <section className={s.wrap} aria-labelledby="close-title">
          <div className={s.closing}>
            <h2 id="close-title">Sua próxima vaga com o ranking de fit</h2>
            <div className={s.closingActions}>
              <Link className="btn btn-primary btn-lg" href="/entrar?modo=cadastro">Criar espaço da empresa <Arrow /></Link>
              <Link className={`btn btn-lg ${s.btnOnDark}`} href="/contato">Falar com vendas</Link>
            </div>
          </div>
        </section>
      </main>

      {/* 10. Rodapé */}
      <footer className={s.footer}>
        <div className={`${s.wrap} ${s.footGrid}`}>
          <div className={s.footBrand}>
            <Wordmark />
            <p>Entrevista por voz e ranking de fit cultural, perfil comportamental e soft skills.</p>
          </div>
          <nav aria-label="Produto"><h2>Produto</h2><ul><li><a href="#recursos">Recursos</a></li><li><a href="#como">Como funciona</a></li><li><a href="#planos">Planos</a></li></ul></nav>
          <nav aria-label="Acesso"><h2>Acesso</h2><ul><li><Link href="/entrar">Entrar</Link></li><li><Link href="/entrar?modo=cadastro">Criar espaço</Link></li><li><Link href="/contato">Falar com vendas</Link></li></ul></nav>
          <nav aria-label="Fontes"><h2>Fontes</h2><ul>{SOURCES.slice(0, 4).map((x) => <li key={x.name}><a href={x.href} target="_blank" rel="noreferrer">{x.name}</a></li>)}</ul></nav>
        </div>
        <div className={`${s.wrap} ${s.footBottom}`}>
          <p>© 2026 MOE</p>
          <p className={s.social}>Redes sociais em breve</p>
          <p>O MOE apoia a decisão de contratação; não é teste psicológico e não decide sozinha.</p>
        </div>
      </footer>
    </>
  );
}
