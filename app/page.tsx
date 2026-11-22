import { SiteHeader, SiteFooter } from '@/components/site/SiteChrome';
import { Hero } from '@/components/marketing/Hero';
import { Manifesto, ComoFunciona, Confianca, CtaFinal } from '@/components/marketing/Sections';
import { TalentGrid } from '@/components/marketing/TalentGrid';
import { DocumentPreview } from '@/components/marketing/DocumentPreview';
import { AsciiDivider } from '@/components/ascii';

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo">
        <Hero />
        <AsciiDivider label="01 → 02" seed={2} />
        <Manifesto />
        <ComoFunciona />
        <TalentGrid />
        <DocumentPreview />
        <Confianca />
        <CtaFinal />
      </main>
      <SiteFooter />
    </>
  );
}
