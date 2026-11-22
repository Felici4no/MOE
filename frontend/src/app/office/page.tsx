import { redirect } from "next/navigation";

// Compatibilidade: /office passa a apontar para a rota canônica do MOE.
export default function OfficeAlias() {
  redirect("/moe");
}
