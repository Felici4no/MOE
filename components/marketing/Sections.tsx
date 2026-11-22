import Link from 'next/link';
import { AsciiDivider, AsciiGlyph, AsciiPortrait } from '@/components/ascii';

/* 02 — MANIFESTO: título monumental centralizado + cartaz tipográfico */
export function Manifesto() {
  return (
    <section aria-labelledby="manifesto-title" className="section border-t-2 border-ink bg-paper">
      <div className="shell relative">
        <p className="meta meta-soft text-center">02 / Manifesto</p>
        <h2 id="manifesto-title" className="display-xl mx-auto mt-6 max-w-[14ch] text-center">
          Não é um teste. É uma conversa.
        </h2>

        <div className="grid-12 mt-[clamp(56px,9vw,128px)] gap-y-12">
          <p className="display-l col-span-4 md:col-span-6 lg:col-span-6">Currículos listam cargos.</p>
          <p className="display-l col-span-4 md:col-span-6 md:col-start-3 lg:col-span-6 lg:col-start-7 md:text-right">
            Histórias mostram o que você faz quando ninguém pediu.
          </p>
        </div>

        <div className="on-signal mx-auto mt-[clamp(48px,8vw,104px)] max-w-[980px] border-2 border-on-signal bg-signal px-[clamp(20px,4vw,56px)] py-[clamp(28px,5vw,56px)] text-center text-on-signal">
          <p className="display-m">
            A fila que você segurou no fim do ano. O erro que você viu antes de todo mundo. A colega nova que você acalmou no intervalo.
          </p>
        </div>

        <div className="grid-12 mt-[clamp(48px,8vw,104px)] gap-y-8">
          <div className="col-span-4 md:col-span-4 lg:col-span-4">
            <hr className="rule mb-4" />
            <p className="meta">Por quê</p>
          </div>
          <div className="col-span-4 md:col-span-4 lg:col-span-4">
            <p className="body-ed">
              Habilidades assim raramente cabem num formulário. Elas aparecem quando alguém pergunta com calma — e escuta a resposta inteira.
            </p>
          </div>
          <div className="col-span-4 md:col-span-8 lg:col-span-4">
            <p className="body-ed text-ink-soft">
              A Lia não dá nota e não procura respostas certas. Ela pede exemplos concretos, uma pergunta por vez. O resto é trabalho de leitura: encontrar, nas suas palavras, o que se repete.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* 03 — COMO FUNCIONA: título à esquerda, capítulos à direita */
const CAPITULOS = [
  {
    n: '01', titulo: 'Converse', glyph: 'conversa' as const,
    texto: 'Você conversa por voz com a Lia, nossa entrevistadora de inteligência artificial. Ela pede situações reais do seu trabalho — uma pergunta por vez, sem pressa e sem nota. Você pode parar quando quiser.',
  },
  {
    n: '02', titulo: 'Descubra', glyph: 'descubra' as const,
    texto: 'Um segundo agente lê a transcrição e procura padrões entre 16 talentos. Um talento só aparece se duas falas diferentes suas o sustentarem, e cada citação é conferida palavra por palavra.',
  },
  {
    n: '03', titulo: 'Receba', glyph: 'receba' as const,
    texto: 'Você recebe um documento privado com seus talentos, suas palavras e seus caminhos. Pode baixar em PDF ou pedir que ele chegue no seu e-mail, depois de confirmar o endereço.',
  },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" aria-labelledby="como-title" className="section scroll-mt-4 border-t-2 border-ink">
      <div className="shell grid-12 gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-4">
          <div className="lg:sticky lg:top-10">
            <p className="meta meta-soft">03 / Método</p>
            <h2 id="como-title" className="display-xl mt-5">Como<br />funciona</h2>
            <div className="panel relative mt-10 hidden h-[260px] lg:block">
              <AsciiPortrait className="absolute inset-0" />
            </div>
            <p className="meta meta-soft mt-3 hidden lg:block">Fig. 02 — Identidade, voz, pensamento</p>
          </div>
        </div>
        <ol className="col-span-4 md:col-span-8 lg:col-span-7 lg:col-start-6">
          {CAPITULOS.map((c, i) => (
            <li key={c.n} className={`grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 border-t-2 border-ink py-10 ${i === CAPITULOS.length - 1 ? 'border-b-2' : ''}`}>
              <span className="num-huge" aria-hidden="true">{c.n}</span>
              <div className="flex flex-col justify-end">
                <h3 className="meta text-base">{c.n} / {c.titulo}</h3>
              </div>
              <p className="col-span-2 max-w-[52ch] md:col-span-1 md:col-start-2">{c.texto}</p>
              <AsciiGlyph name={c.glyph} className="col-span-2 md:col-span-1 md:col-start-2 text-ink-soft" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* 06 — CONFIANÇA E AUTONOMIA: bloco documental com legendas e linhas */
const PRINCIPIOS = [
  {
    t: 'O relatório é seu.',
    d: 'Você vê o documento primeiro. Ninguém da empresa recebe nada por causa desta conversa.',
  },
  {
    t: 'Compartilhar é outra decisão.',
    d: 'Enviar o mapa a uma empresa exige uma autorização específica, separada de tudo o mais. Pedir o documento no seu e-mail não autoriza ninguém a vê-lo.',
  },
  {
    t: 'Evidência, não opinião.',
    d: 'Cada talento traz as suas próprias palavras. O que não tem duas histórias diferentes sustentando fica de fora — inclusive quando isso deixa o mapa menor.',
  },
  {
    t: 'Sem diagnóstico.',
    d: 'Não é teste psicológico validado. Não decide contratação, promoção ou demissão: a decisão sobre sua carreira é sua e da sua liderança.',
  },
];

export function Confianca() {
  return (
    <section id="confianca" aria-labelledby="confianca-title" className="section scroll-mt-4 border-t-2 border-ink bg-surface">
      <div className="shell">
        <div className="grid-12 gap-y-8">
          <p className="meta meta-soft col-span-4 md:col-span-8 lg:col-span-3">06 / Confiança e autonomia</p>
          <h2 id="confianca-title" className="display-xl col-span-4 md:col-span-8 lg:col-span-9">
            Suas histórias.<br />Suas evidências.<br /><span className="mark">Sua decisão.</span>
          </h2>
        </div>
        <dl className="mt-[clamp(48px,7vw,96px)] grid gap-0 border-t-2 border-ink md:grid-cols-2">
          {PRINCIPIOS.map((p, i) => (
            <div key={p.t} className={`border-b-2 border-ink py-8 md:px-0 ${i % 2 === 0 ? 'md:border-r-2 md:pr-10' : 'md:pl-10'}`}>
              <dt className="flex items-baseline gap-4">
                <span className="meta">{String(i + 1).padStart(2, '0')}</span>
                <span className="display-m">{p.t}</span>
              </dt>
              <dd className="mt-4 max-w-[48ch] pl-9 text-ink-soft">{p.d}</dd>
            </div>
          ))}
        </dl>
        <aside className="callout mt-12 max-w-[72ch]" aria-label="Estado desta versão">
          <p className="meta mb-2">Nota de transparência</p>
          <p className="small text-ink-soft">
            Esta é uma versão experimental. Antes de qualquer piloto com pessoas reais, as regras de retenção, exclusão, segurança e responsabilidade serão definidas e publicadas. Até lá, a entrevista pública funciona apenas em modo de demonstração, com dados sintéticos.
          </p>
        </aside>
      </div>
    </section>
  );
}

/* 07 — CTA FINAL */
export function CtaFinal() {
  return (
    <section aria-labelledby="cta-title" className="on-signal border-t-2 border-ink bg-signal text-on-signal">
      <AsciiDivider seed={21} className="border-on-signal" />
      <div className="shell py-[clamp(80px,12vw,176px)] text-center">
        <p className="meta">07 / Próximo passo</p>
        <h2 id="cta-title" className="display-xl mx-auto mt-6 max-w-[16ch]">
          Pronto para descobrir o que você já sabe fazer?
        </h2>
        <div className="mt-12">
          <Link href="/entrevista" className="btn btn-onsignal">Iniciar meu mapa</Link>
        </div>
      </div>
    </section>
  );
}
