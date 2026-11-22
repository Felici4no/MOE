import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Instrument_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const display = Space_Grotesk({ subsets: ['latin', 'latin-ext'], weight: ['500', '700'], variable: '--font-space-grotesk', display: 'swap' });
const sans = Instrument_Sans({ subsets: ['latin', 'latin-ext'], weight: ['400', '600'], style: ['normal', 'italic'], variable: '--font-instrument-sans', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin', 'latin-ext'], weight: ['400', '500'], variable: '--font-plex-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Mapa de Talentos', template: '%s · Mapa de Talentos' },
  description: 'Uma conversa por voz sobre situações reais do seu trabalho. Um documento com os padrões que suas histórias sustentam, com evidências verificáveis.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F2E9' },
    { media: '(prefers-color-scheme: dark)', color: '#12110F' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
        {children}
      </body>
    </html>
  );
}
