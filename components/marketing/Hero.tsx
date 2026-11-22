import Link from 'next/link';
import { AsciiField } from '@/components/ascii';

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden pb-[clamp(56px,8vw,120px)] pt-6">
      <div className="shell">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-3">
          <p className="meta">Mapa de Talentos <span aria-hidden="true">/</span> Experiment 001 <span aria-hidden="true">/</span> Human Potential</p>
          <p className="meta meta-soft">N° 001 — PT-BR</p>
        </div>

        <div className="relative mt-[clamp(28px,5vw,64px)]">
          <p className="vertical-meta meta meta-soft absolute -left-1 top-2 hidden xl:block" aria-hidden="true">
            relatos → padrões → descobertas
          </p>
          <h1 id="hero-title" className="display-monument xl:pl-10">
            Você é mais<br />do que seu<br /><span className="mark">cargo.</span>
          </h1>
        </div>

        <div className="grid-12 mt-[clamp(32px,5vw,72px)] items-end gap-y-10">
          <div className="col-span-4 md:col-span-8 lg:col-span-5 xl:pl-10">
            <p className="display-m max-w-[22ch]">“Seu trabalho deixa pistas. Vamos encontrá-las.”</p>
            <p className="mt-5 max-w-[46ch] text-ink-soft">
              Converse com a Lia sobre situações reais do seu trabalho. Você recebe um documento com os padrões que suas histórias sustentam — e cada um vem com as suas palavras como evidência.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/entrevista" className="btn btn-primary">Começar conversa</Link>
              <a href="#como-funciona" className="btn">Como funciona</a>
            </div>
          </div>
          <figure className="col-span-4 md:col-span-8 lg:col-span-7 lg:col-start-6 m-0">
            <div className="panel panel-shadow relative h-[260px] md:h-[360px] lg:h-[420px]">
              <AsciiField className="absolute inset-0" />
            </div>
            <figcaption className="mt-3 flex justify-between gap-4">
              <span className="meta">Fig. 01 — Relatos se organizam em padrões</span>
              <span className="meta meta-soft hidden sm:inline">Mova o cursor</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
