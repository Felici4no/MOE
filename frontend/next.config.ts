import path from "node:path";
import type { NextConfig } from "next";

const api = process.env.PF_API_ORIGIN ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  devIndicators: false,
  // O MOE reutiliza o domínio da raiz (src/office-experience) e o protocolo do
  // escritório (office/moe-webview/protocol.ts), fora de frontend/.
  outputFileTracingRoot: path.join(__dirname, ".."),
  experimental: { externalDir: true },
  // Em produção o Nginx encaminha /api ao FastAPI; em dev o Next faz o proxy.
  async rewrites() {
    return process.env.NODE_ENV === "production" ? [] : [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};

export default nextConfig;
