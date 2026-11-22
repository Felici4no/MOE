import Link from 'next/link';
import { SiteHeader } from '@/components/site/SiteChrome';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="shell py-[clamp(64px,10vw,144px)]">
        <p className="meta meta-soft">Erro 404</p>
        <h1 className="display-xl mt-4 max-w-[14ch]">Não encontramos esta página.</h1>
        <p className="lede mt-6 text-ink-soft">
          Se você abriu o link de um relatório, ele pode ter expirado ou o endereço pode estar incompleto. Relatórios privados não ficam listados em lugar nenhum.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/" className="btn btn-primary">Ir para o início</Link>
          <Link href="/relatorio/demo-tres" className="btn">Ver relatório de exemplo</Link>
        </div>
      </main>
    </>
  );
}
