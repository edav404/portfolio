import type { NextConfig } from "next";

// Cabeceras base de seguridad. La CSP completa se define en la Fase 2 tras la auditoría.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // HSTS corto y sin includeSubDomains hasta verificar todos los subdominios (se amplía en la Fase 8).
  { key: "Strict-Transport-Security", value: "max-age=86400" },
];

const nextConfig: NextConfig = {
  // Servidor Node autocontenido para Docker/Coolify (.next/standalone/server.js).
  output: "standalone",
  // Se conserva para no romper las URLs ya publicadas (/proyectos/slug/).
  trailingSlash: true,
  poweredByHeader: false,
  // La optimización de imágenes se evalúa en la auditoría (Fase 1/7).
  images: { unoptimized: true },
  // Solo afecta a `next dev` (túneles de prueba).
  allowedDevOrigins: ["127.0.0.1", "localhost", "*.trycloudflare.com"],
  turbopack: { root: process.cwd() },
  // Compatibilidad temporal con los endpoints PHP antiguos (rewrite interno: conserva el POST).
  async rewrites() {
    return [
      { source: "/api/lastfm.php", destination: "/api/lastfm/" },
      { source: "/api/contact.php", destination: "/api/contact/" },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
