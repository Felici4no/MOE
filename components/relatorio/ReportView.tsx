import Link from 'next/link';
import { Download, ArrowLeft } from 'lucide-react';
import type { ReportDocument } from '@/lib/domain/report';
import { codigoDocumento } from '@/lib/domain/report';
import { ReportCover, ReportIndex, ChapterIntro, ChapterTalents, ChapterPaths, ChapterDiscovery, ChapterAbout, DemoTag } from './ReportParts';
import { EmailRequest } from './EmailRequest';
import { Logo } from '@/components/site/SiteChrome';

export function ReportView({ doc, email, ttlDays }: { doc: ReportDocument; email: { disponivel: boolean; motivo: string | null }; ttlDays: number }) {
  return (
    <>
      <ReportTopBar doc={doc} />
      <main id="conteudo">
        <ReportCover doc={doc} />
        <ReportIndex doc={doc} />
        <ChapterIntro doc={doc} />
        <ChapterTalents doc={doc} />
        <ChapterPaths doc={doc} />
        <ChapterDiscovery doc={doc} />
        <ChapterAbout doc={doc} ttlDays={ttlDays} />
        <section aria-labelledby="acoes-title" className="no-print border-t-2 border-ink bg-muted">
          <div className="shell grid-12 gap-y-8 py-[clamp(48px,7vw,96px)]">
            <div className="col-span-4 md:col-span-8 lg:col-span-5">
              <p className="meta meta-soft">Fim do documento</p>
              <h2 id="acoes-title" className="display-l mt-3">Guarde seu mapa.</h2>
              <p className="mt-4 max-w-[44ch] text-ink-soft">O PDF tem a mesma estrutura deste documento, paginado em A4. Ele é gerado agora, a partir do resultado validado.</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href={`/api/relatorios/${encodeURIComponent(doc.id)}/pdf`} className="btn btn-primary" download>
                  <Download size={18} aria-hidden="true" /> Baixar PDF
                </a>
                <Link href="/" className="btn"><ArrowLeft size={18} aria-hidden="true" /> Voltar ao início</Link>
              </div>
            </div>
            <div className="col-span-4 md:col-span-8 lg:col-span-6 lg:col-start-7">
              <EmailRequest reportId={doc.id} disponivel={email.disponivel} motivo={email.motivo} />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export function ReportTopBar({ doc }: { doc: ReportDocument }) {
  return (
    <div className="no-print sticky top-0 z-20 border-b-2 border-ink bg-paper">
      <div className="shell flex min-h-[56px] items-center justify-between gap-4">
        <Link href="/" aria-label="Mapa de Talentos — início" className="no-underline"><Logo compact /></Link>
        <p className="meta hidden truncate sm:block">{codigoDocumento(doc.id)}</p>
        <div className="flex items-center gap-3">
          {doc.kind === 'demo' && <DemoTag className="hidden md:inline-flex" />}
          <a href={`/api/relatorios/${encodeURIComponent(doc.id)}/pdf`} className="btn btn-sm" download>
            <Download size={16} aria-hidden="true" /> PDF
          </a>
        </div>
      </div>
    </div>
  );
}

/** Quando há alerta de bem-estar: nenhum conteúdo do relatório, apenas acolhimento e canais de apoio. */
export function SupportView({ doc }: { doc: ReportDocument }) {
  return (
    <main id="conteudo" className="shell py-[clamp(56px,9vw,128px)]">
      <div className="flex items-center justify-between gap-4 border-b-2 border-ink pb-3">
        <Link href="/" aria-label="Mapa de Talentos — início" className="no-underline"><Logo /></Link>
        {doc.kind === 'demo' && <DemoTag />}
      </div>
      <div className="mt-14 max-w-[760px]">
        <p className="meta meta-soft">Uma pausa</p>
        <h1 className="display-l mt-4">Obrigado por confiar o que você contou.</h1>
        <p className="lede mt-6 max-w-[52ch]">
          Algumas coisas que apareceram na conversa merecem cuidado e atenção de gente. Por isso, este mapa não foi gerado e nada será enviado a nenhuma empresa.
        </p>
        <div className="panel mt-10 p-6">
          <p className="meta">Se fizer sentido para você</p>
          <ul className="mt-4 space-y-3">
            <li>Converse com alguém de confiança, com o RH ou com um profissional de saúde.</li>
            <li>
              Se você estiver pensando em se machucar ou sentir que sua vida está em risco, ligue para o <strong>CVV — 188</strong> (ligação gratuita, 24 horas) ou acesse{' '}
              <a href="https://cvv.org.br" target="_blank" rel="noopener noreferrer">cvv.org.br</a>.
            </li>
          </ul>
        </div>
        <div className="mt-10"><Link href="/" className="btn">Voltar ao início</Link></div>
      </div>
    </main>
  );
}
