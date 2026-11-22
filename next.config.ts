import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @react-pdf/renderer roda somente no servidor (Route Handlers de PDF e e-mail).
  serverExternalPackages: ['@react-pdf/renderer'],
  // Arquivos lidos em tempo de execução pelas funções serverless.
  outputFileTracingIncludes: {
    '/api/relatorios/**': ['./assets/fonts/**'],
    '/api/email/**': ['./assets/fonts/**'],
    '/api/analise': ['./prompts/**'],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
        ],
      },
      {
        // Relatórios são privados: nunca indexar nem guardar em caches compartilhados.
        source: '/relatorio/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;
