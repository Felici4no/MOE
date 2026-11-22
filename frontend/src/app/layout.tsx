import type { Metadata, Viewport } from "next";
import { Host_Grotesk } from "next/font/google";
import "./globals.css";

const sans = Host_Grotesk({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "MOE · contratação por fit cultural", template: "%s · MOE" },
  description: "Entrevista por voz que ranqueia candidatos por fit cultural, perfil comportamental e soft skills, com a frase de cada pessoa que sustenta a nota.",
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
