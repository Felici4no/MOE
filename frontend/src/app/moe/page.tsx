import { redirect } from "next/navigation";

// Rota pública canônica de marketing: MOE / MyOfficeExperience.
// A tela existente de integração do Pixel Agents permanece em /office.
export default function MoePage() {
  redirect("/office");
}
