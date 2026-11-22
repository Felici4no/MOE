import type { Metadata } from "next";
import { MoeExperience } from "@/components/moe/MoeExperience";

// Rota canônica do MOE / MyOfficeExperience. /office redireciona para cá (next.config.ts).
export const metadata: Metadata = {
  title: { absolute: "MOE — My Office Experience" },
  description: "Entre no escritório. Converse. Decida. Reflita. Uma simulação fictícia em pixel art.",
  robots: { index: false },
};

export default function MoePage() {
  return <MoeExperience />;
}
