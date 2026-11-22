import type { Metadata } from "next";
import { Suspense } from "react";
import { MoeExperience } from "@/components/moe/MoeExperience";

// Rota canônica do MOE / MyOfficeExperience. /office redireciona para cá.
// Sem parâmetros: demonstração S01. ?cenario=<id> ou ?sessao=<id>: cenário publicado pela empresa.
export const metadata: Metadata = {
  title: { absolute: "MOE — My Office Experience" },
  description: "Entre no escritório. Converse. Decida. Reflita. Uma simulação fictícia em pixel art.",
  robots: { index: false },
};

export default function MoePage() {
  return (
    <Suspense>
      <MoeExperience />
    </Suspense>
  );
}
