import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import s from "./landing.module.css";

export const metadata: Metadata = {
 title: { absolute: "MOE — MyOfficeExperience | Decisões no contexto do trabalho" },
 description: "Simule situações profissionais, converse com colegas virtuais e gere evidências complementares para uma decisão humana.",
};

const observations = [
 ["01", "Priorização", "Quais ações vêm primeiro quando aparecem prioridades conflitantes."],
 ["02", "Comunicação", "Como alguém explica decisões, faz perguntas e comunica riscos."],
 ["03", "Colaboração", "Como responde a pedidos de ajuda e negocia alternativas."],
 ["04", "Resolução", "Que informações busca antes de decidir e como justifica suas escolhas."],
];
const stages = [
 ["01 / CONTEXTO","Uma situação","A empresa transforma um problema típico do cotidiano em um cenário controlado."],
 ["02 / EXPERIÊNCIA","Uma decisão","O participante conversa com colegas virtuais e precisa lidar com mudanças."],
 ["03 / DEVOLUTIVA","Mais contexto","As respostas literais são reunidas, com origem identificada como simulação."],
];
export default function Landing() {
 return <div className={s.site}>
  <a className={s.skip} href="#conteudo">Pular para conteúdo</a>
  <div className={s.topWrap}><header className={[s.container,s.header].join(" ")}>
   <Link href="/" className={s.identity}><strong className={s.wordmark}>MOE</strong><span className={[s.brandSub,s.mono].join(" ")}>MY OFFICE EXPERIENCE</span></Link>
   <nav className={s.nav} aria-label="Navegação"><a href="#problema">O PROBLEMA</a><a href="#experiencia">A EXPERIÊNCIA</a><a href="#metodo">O MÉTODO</a><Link className={s.navCta} href="/moe">EXPERIMENTAR ↗</Link></nav>
  </header></div>
  <main id="conteudo">
   <div className={s.topWrap}><section className={[s.container,s.hero].join(" ")}>
    <div>
     <span className={[s.heroLabel,s.mono].join(" ")}>MOE / MY OFFICE EXPERIENCE</span>
     <h1>UMA ENTREVISTA NÃO REPRODUZ <span className={s.accent}>UM DIA DE TRABALHO.</span></h1>
     <p className={s.lead}>Entre em um escritório virtual. Converse com personagens e descubra como as decisões mudam diante de situações reais de rotina — simuladas em um ambiente controlado.</p>
     <div className={s.heroActions}><Link href="/moe" className={s.primaryButton}>ENTRAR NO ESCRITÓRIO <span aria-hidden="true">↗</span></Link><a className={s.secondaryLink} href="#problema">CONHECER O PROBLEMA ↓</a></div>
     <div className={s.heroNumbers}><span className={[s.chip,s.mono].join(" ")}>01 / CONTEXTO</span><span className={[s.chip,s.mono].join(" ")}>02 / SIMULAÇÃO</span><span className={[s.chip,s.mono].join(" ")}>03 / EVIDÊNCIAS</span></div>
    </div>
    <div className={s.heroMedia}><div className={s.imageFrame}><Image className={s.heroImage} src="/moe/office.png" width={1100} height={680} alt="Captura real do escritório virtual em pixel art do MOE" priority /></div><div className={[s.imageCaption,s.mono].join(" ")}><span>OFFICE / INTERFACE REAL</span><span>PIXEL AGENTS ENGINE · MIT</span></div></div>
   </section></div>

   <section id="problema" className={[s.section,s.cost].join(" ")}><div className={s.container}>
    <div className={s.problemTop}><div><span className={[s.eyebrow,s.mono].join(" ")}>01 / O PROBLEMA</span><h2 className={s.sectionHeading}>QUAL É O PESO DE UMA CONTRATAÇÃO ERRADA?</h2></div><p className={s.sectionText}>Nem todo desalinhamento é técnico. A dificuldade pode estar em prioridades, colaboração e comunicação — percebida depois da contratação.</p></div>
    <div className={s.costGrid}><div className={s.costNumber}><span className={[s.eyebrow,s.mono].join(" ")}>CENÁRIO ILUSTRATIVO / FUNÇÃO TÉCNICA</span><strong>R$ 120 MIL</strong><span>Custo possível de substituição, não perda comprovada.</span></div>
    <div className={s.costInfo}><h3>O custo de descobrir tarde demais.</h3><p>Referência Gallup: cerca de 80% do salário anual em custos de reposição de funções técnicas. Aplicando essa referência a um salário hipotético de R$ 12.500 por mês, o resultado é R$ 120 mil.</p><p className={s.note}>Estimativa ilustrativa com referência de pesquisa dos EUA. Não é uma média do Brasil nem o custo de uma demissão nos primeiros 90 dias. Fontes: <a href="https://www.gallup.com/workplace/646538/employee-turnover-cost-business.aspx" target="_blank" rel="noopener noreferrer">Gallup</a> e <a href="https://www.roberthalf.com/br/pt" target="_blank" rel="noopener noreferrer">Robert Half</a>.</p></div></div>
    <div className={s.frictions}><div className={s.friction}><b>01 / CURRÍCULO</b><span>Mostra experiências anteriores, mas não cada decisão em um imprevisto.</span></div><div className={s.friction}><b>02 / ENTREVISTA</b><span>Ajuda a conhecer pessoas, mas não reproduz todo o cotidiano.</span></div><div className={s.friction}><b>03 / CONTEXTO</b><span>Uma simulação pode complementar a avaliação com observações concretas.</span></div></div>
   </div></section>

   <section id="experiencia" className={[s.section,s.experience].join(" ")}><div className={s.container}>
    <div className={s.experienceLead}><div><span className={[s.eyebrow,s.mono].join(" ")}>02 / A EXPERIÊNCIA</span><h2 className={s.sectionHeading}>BEM-VINDO AO <span className={s.accent}>MOE.</span></h2></div><p className={s.sectionText}>Um escritório virtual construído sobre a estrutura visual do Pixel Agents. Personagens apresentam situações e o participante toma decisões.</p></div>
    <div className={s.experienceGrid}><div className={s.mainShot}><Image className={s.heroImage} src="/moe/simulation.png" width={1280} height={750} alt="Captura real da interface de simulação em andamento"/></div><div className={s.sideShots}><div className={s.sideShot}><span className={[s.shotLabel,s.mono].join(" ")}>OFFICE / AMBIENTE</span><Image src="/moe/office.png" width={900} height={570} alt="Escritório MOE"/></div><div className={s.sideShot}><span className={[s.shotLabel,s.mono].join(" ")}>CAST / PERSONAGENS</span><Image src="/moe/characters.png" width={900} height={570} alt="Interface de personalização de personagens"/></div></div></div>
    <div className={s.people}><div className={s.person}><span className={s.pixelIcon}>M</span><div><b>Maia</b><small>GESTORA · Apresenta prioridades.</small></div></div><div className={s.person}><span className={s.pixelIcon}>L</span><div><b>Léo</b><small>COLEGA · Solicita colaboração.</small></div></div><div className={s.person}><span className={s.pixelIcon}>N</span><div><b>Nara</b><small>CLIENTE INTERNO · Pede atualização.</small></div></div></div>
   </div></section>

   <section id="metodo" className={[s.section,s.workflow].join(" ")}><div className={s.container}><div className={s.workflowHeader}><div><span className={[s.eyebrow,s.mono].join(" ")}>03 / COMO FUNCIONA</span><h2 className={s.sectionHeading}>DO PROBLEMA À DECISÃO OBSERVÁVEL.</h2></div><p className={s.sectionText}>A empresa estrutura um cenário; o participante responde; a devolutiva registra o que aconteceu dentro da simulação.</p></div><div className={s.steps}>{stages.map(([n,t,d])=><div key={n} className={s.step}><span className={[s.stepIndex,s.mono].join(" ")}>{n}</span><h3>{t}</h3><p>{d}</p></div>)}</div></div></section>

   <section className={[s.section,s.evidence].join(" ")}><div className={[s.container,s.evidenceSplit].join(" ")}><div><span className={[s.eyebrow,s.mono].join(" ")}>04 / DIFERENCIAL</span><h2>NÃO APENAS O QUE A PESSOA DIZ. O QUE ELA DECIDE.</h2></div><div className={s.signals}>{observations.map(([n,t,d])=><div className={s.signal} key={n}><span className={s.mono}>{n}</span><div><strong>{t}</strong><p>{d}</p></div></div>)}</div></div></section>

   <section className={[s.section,s.reports].join(" ")}><div className={[s.container,s.reportsGrid].join(" ")}><div className={s.reportsText}><span className={[s.eyebrow,s.mono].join(" ")}>05 / DEVOLUTIVA</span><h2 className={s.sectionHeading}>EVIDÊNCIAS. NÃO ACHISMOS.</h2><p className={s.sectionText}>Uma devolutiva pessoal preserva as respostas literais e identifica sua origem: uma situação fictícia.</p><p className={s.disclaimer}>As decisões na simulação não comprovam competências nem preveem desempenho profissional. Qualquer uso na seleção exige validação e avaliação humana.</p></div><div className={s.reportFrame}><Image src="/moe/report.png" width={1280} height={750} alt="Captura real da página de devolutiva MOE" className={s.heroImage}/></div></div></section>

   <section className={s.final}><div className={[s.container,s.finalInner].join(" ")}><div><span className={[s.eyebrow,s.mono].join(" ")}>MOE / MY OFFICE EXPERIENCE</span><h2>NÃO DECIDIMOS POR VOCÊ. <span className={s.accent}>DAMOS MAIS CONTEXTO.</span></h2><p>O que você faria diante de uma mudança de prioridade?</p></div><div className={s.finalCta}><Link href="/moe" className={s.primaryButton}>EXPERIMENTAR A SIMULAÇÃO ↗</Link><Link href="/acesso" className={s.secondaryLink}>ACESSAR MAPA DE TALENTOS ↗</Link><p className={s.finalNote}>A demo atual funciona em texto, sem voz integrada à Agora.</p></div></div></section>
  </main>
  <footer className={s.footer}><div className={[s.container,s.footerInner].join(" ")}><small className={s.mono}>MOE © 2026 · VISUAL ENGINE: PIXEL AGENTS (MIT) © PABLO DE LUCCA</small><nav className={s.footerLinks} aria-label="Rodapé"><Link href="/moe">SIMULAÇÃO</Link><Link href="/acesso">ACESSO</Link><a href="https://github.com/Felici4no/MOE" target="_blank" rel="noopener noreferrer">GITHUB</a></nav></div></footer>
 </div>;
}
