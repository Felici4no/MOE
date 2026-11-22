import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Literata } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", axes: ["wdth", "opsz"], display: "swap" });
const read = Literata({ subsets: ["latin"], variable: "--font-read", style: ["normal", "italic"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Pontos Fortes", template: "%s · Pontos Fortes" },
  description: "Entrevista por voz em tempo real para descobrir seus pontos fortes, com evidência nas suas próprias palavras.",
};

export const viewport: Viewport = { themeColor: "#14204a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${read.variable}`}>
      <body>{children}</body>
    </html>
  );
}
