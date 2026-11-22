'use client';

import { useId, useState } from 'react';
import { DOMINIOS, DOMINIO_INFO, TEMA_POR_NOME, CAMINHOS, CAMINHO_INFO } from '@/lib/domain/catalogo';

/** 04 — TALENTOS: grade editorial interativa com os 4 domínios e 16 temas reais. */
export function TalentGrid() {
  const [ativo, setAtivo] = useState('Olho Clínico');
  const painelId = useId();
  const tema = TEMA_POR_NOME[ativo];
  const dominio = DOMINIO_INFO[tema.dominio];

  return (
    <section id="talentos" aria-labelledby="talentos-title" className="section scroll-mt-4 border-t-2 border-ink">
      <div className="shell">
        <div className="grid-12 items-end gap-y-6">
          <div className="col-span-4 md:col-span-5 lg:col-span-7">
            <p className="meta meta-soft">04 / Catálogo</p>
            <h2 id="talentos-title" className="display-xl mt-5">16 talentos.{' '}<br />4 domínios.</h2>
          </div>
          <p className="col-span-4 md:col-span-3 lg:col-span-4 lg:col-start-9 text-ink-soft">
            Nomes do dia a dia, para quem trabalha. Selecione um tema para ver o que ele significa e como costuma aparecer numa história.
          </p>
        </div>

        <div className="mt-14 grid gap-[2px] border-2 border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(DOMINIOS).map(([nome, temas]) => (
            <div key={nome} className="bg-surface">
              <div className="border-b-2 border-ink bg-paper px-5 py-4">
                <p className="meta">Domínio {DOMINIO_INFO[nome].numero}</p>
                <h3 className="font-display mt-1 text-xl font-bold tracking-tight">{nome}</h3>
                <p className="small mt-1 text-ink-soft">{DOMINIO_INFO[nome].descricao}</p>
              </div>
              <ul>
                {temas.map(t => {
                  const info = TEMA_POR_NOME[t];
                  const on = t === ativo;
                  return (
                    <li key={t} className="border-b border-ink last:border-b-0">
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-controls={painelId}
                        onClick={() => setAtivo(t)}
                        onMouseEnter={() => setAtivo(t)}
                        className={`flex min-h-[56px] w-full items-center gap-4 px-5 py-3 text-left transition-colors ${on ? 'bg-ink text-paper' : 'hover:bg-muted'}`}
                      >
                        <span className="meta w-6 shrink-0">{String(info.numero).padStart(2, '0')}</span>
                        <span className="font-display text-lg font-medium">{t}</span>
                        <span aria-hidden="true" className="ml-auto font-mono">{on ? '■' : '□'}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div id={painelId} aria-live="polite" className="mt-6 grid min-h-[300px] border-2 border-ink bg-paper md:grid-cols-12">
          <div className="border-b-2 border-ink p-6 md:col-span-4 md:border-b-0 md:border-r-2">
            <p className="meta">{dominio.numero} · {dominio.nome}</p>
            <p className="num-huge mt-6 !text-[clamp(3.5rem,8vw,6.5rem)]" aria-hidden="true">{String(tema.numero).padStart(2, '0')}</p>
            <h3 className="display-l mt-2">{tema.nome}</h3>
          </div>
          <dl className="grid gap-6 p-6 md:col-span-8 md:grid-cols-2">
            <div className="md:col-span-2">
              <dt className="meta meta-soft">Descrição</dt>
              <dd className="display-m mt-2">{tema.essencia}</dd>
            </div>
            <div>
              <dt className="meta meta-soft">No trabalho</dt>
              <dd className="mt-2">{tema.noTrabalho}</dd>
            </div>
            <div>
              <dt className="meta meta-soft">Como aparece numa história</dt>
              <dd className="mt-2">{tema.sinal}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="meta meta-soft">Uma pergunta da Lia</dt>
              <dd className="mt-2 italic">“{tema.pergunta}”</dd>
            </div>
          </dl>
        </div>

        <div className="mt-20 grid-12 gap-y-6">
          <div className="col-span-4 md:col-span-8 lg:col-span-4">
            <h3 className="display-m">E 6 caminhos.</h3>
            <p className="mt-3 text-ink-soft">Interesses profissionais, inspirados no modelo RIASEC. O mapa sugere até dois — nunca decide.</p>
          </div>
          <ol className="col-span-4 md:col-span-8 lg:col-span-8 grid border-t-2 border-ink sm:grid-cols-2">
            {CAMINHOS.map((c, i) => (
              <li key={c} className="border-b border-ink py-4 sm:odd:pr-6 sm:even:pl-6">
                <p className="flex gap-3"><span className="meta pt-1">{String(i + 1).padStart(2, '0')}</span><span className="font-display text-lg font-medium">{c}</span></p>
                <p className="small ml-9 text-ink-soft">{CAMINHO_INFO[c].gosta}.</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
