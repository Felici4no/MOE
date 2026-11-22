import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/site/SiteChrome';

export const metadata: Metadata = { title: 'Privacidade (rascunho)' };

/**
 * Estrutura para revisão jurídica. Descreve fatos do comportamento ATUAL do sistema;
 * não é texto jurídico definitivo.
 */
const SECOES = [
  {
    t: 'O que esta versão faz hoje',
    d: [
      'A entrevista pública funciona em modo de demonstração: a conversa é sintética, exibida em texto, e nenhuma fala sua é gravada ou enviada.',
      'Se você ligar o microfone na demonstração, apenas o volume da sua voz é lido no seu aparelho, para a visualização reagir. O áudio não sai do navegador.',
      'Relatórios de demonstração são reconstruídos a partir de dados fictícios e não são armazenados.',
    ],
  },
  {
    t: 'Quando a conversa real estiver ativa',
    d: [
      'O documento guarda o resultado validado (talentos, citações e caminhos), não a transcrição completa, e expira após um prazo definido.',
      'O link do relatório usa um identificador aleatório e não é listado em lugar nenhum.',
      'Para receber o documento por e-mail, você confirma o endereço com um código. O endereço não é registrado em logs.',
      'Receber por e-mail não autoriza nenhuma empresa a ver o documento. Compartilhar exige uma autorização específica, separada.',
      'Se a conversa trouxer sinais de sofrimento, o mapa não é gerado nem compartilhado.',
    ],
  },
  {
    t: 'Pendente de definição antes de qualquer piloto',
    d: [
      'Base legal (LGPD), controlador e operador dos dados.',
      'Prazos de retenção e processo de exclusão a pedido.',
      'Provedores envolvidos (voz, análise, e-mail, armazenamento) e transferência internacional.',
      'Canal de contato do encarregado de dados.',
    ],
  },
];

export default function PrivacidadePage() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="shell py-[clamp(48px,8vw,112px)]">
        <div className="grid-12 gap-y-8">
          <div className="col-span-4 md:col-span-8 lg:col-span-4">
            <p className="meta meta-soft">Institucional</p>
            <h1 className="display-xl mt-4">Privacidade</h1>
            <p className="tag tag-demo mt-6">Rascunho em revisão · não é texto jurídico definitivo</p>
          </div>
          <div className="col-span-4 md:col-span-8 lg:col-span-7 lg:col-start-6">
            {SECOES.map((s, i) => (
              <section key={s.t} className="border-t-2 border-ink py-8">
                <h2 className="display-m flex gap-4"><span className="meta pt-2">{String(i + 1).padStart(2, '0')}</span>{s.t}</h2>
                <ul className="mt-4 space-y-3 pl-9">
                  {s.d.map(x => <li key={x} className="list-[square]">{x}</li>)}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
