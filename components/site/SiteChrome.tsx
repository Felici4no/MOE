import Link from 'next/link';
import { AVISO_PADRAO } from '@/lib/domain/catalogo';
import { staticField } from '@/lib/ascii/core';
import pkg from '@/package.json';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span aria-hidden="true" className="grid h-9 w-9 place-items-center border-2 border-ink bg-signal font-mono text-[11px] font-medium leading-none text-on-signal">
        M/T
      </span>
      {!compact && <span className="meta font-medium tracking-[0.14em]">Mapa de Talentos</span>}
    </span>
  );
}

const NAV = [
  { href: '/#como-funciona', label: 'Como funciona' },
  { href: '/#talentos', label: 'Talentos' },
  { href: '/#documento', label: 'O documento' },
  { href: '/#confianca', label: 'Confiança' },
];

export function SiteHeader() {
  return (
    <header className="border-b-2 border-ink bg-paper">
      <div className="shell flex min-h-[68px] items-center justify-between gap-4">
        <Link href="/" className="no-underline" aria-label="Mapa de Talentos — início">
          <Logo />
        </Link>
        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {NAV.map(item => (
              <li key={item.href}><Link href={item.href} className="meta no-underline hover:underline">{item.label}</Link></li>
            ))}
          </ul>
        </nav>
        <Link href="/entrevista" className="btn btn-primary btn-sm">Começar conversa</Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const strip = staticField(220, 3, 19).join('\n');
  return (
    <footer className="border-t-2 border-ink bg-paper">
      <pre className="ascii ascii-faint m-0 overflow-hidden px-[var(--gutter)] py-3 text-[11px]" aria-hidden="true">{strip}</pre>
      <div className="shell grid-12 gap-y-10 border-t-2 border-ink py-14">
        <div className="col-span-4 md:col-span-8 lg:col-span-5">
          <Logo />
          <p className="mt-6 max-w-[42ch] text-ink-soft">
            Uma conversa por voz sobre situações reais do seu trabalho. Um documento com os padrões que suas histórias sustentam.
          </p>
          <p className="meta mt-8">v{pkg.version} · Experiment 001 · Fase 1</p>
        </div>
        <nav aria-label="Rodapé" className="col-span-2 md:col-span-4 lg:col-span-3">
          <p className="meta meta-soft mb-4">Navegação</p>
          <ul className="space-y-2">
            <li><Link href="/">Início</Link></li>
            <li><Link href="/#como-funciona">Como funciona</Link></li>
            <li><Link href="/#talentos">Os 16 talentos</Link></li>
            <li><Link href="/entrevista">Entrevista</Link></li>
            <li><Link href="/relatorio/demo-tres">Relatório de exemplo</Link></li>
          </ul>
        </nav>
        <div className="col-span-2 md:col-span-4 lg:col-span-4">
          <p className="meta meta-soft mb-4">Institucional</p>
          <ul className="space-y-2">
            <li><Link href="/privacidade">Privacidade <span className="meta">(rascunho)</span></Link></li>
          </ul>
          <p className="meta meta-soft mb-3 mt-8">Créditos</p>
          <p className="small text-ink-soft">
            Tipografia: Space Grotesk, Instrument Sans e IBM Plex Mono (SIL Open Font License).
            Catálogo inspirado em Big Five (IPIP) e RIASEC.
          </p>
        </div>
      </div>
      <div className="border-t-2 border-ink">
        <p className="shell small py-5 text-ink-soft">{AVISO_PADRAO}</p>
      </div>
    </footer>
  );
}
