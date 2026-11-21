import type { NextConfig } from "next";
import { LASTFM_IMAGE_HOSTS } from "./lib/server/lastfm-hosts";
import { wordpressRedirects } from "./lib/redirects";

const isDev = process.env.NODE_ENV === "development";

/**
 * CSP estática (SEC-02). Sin nonce a propósito: el nonce obliga a renderizar todas las páginas
 * de forma dinámica (adiós a la generación estática), y este sitio no maneja datos sensibles.
 * Por eso `script-src` necesita `'unsafe-inline'` (scripts inline de hidratación de Next).
 * Ver node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md.
 *
 * Se publica en Report-Only: las violaciones salen en la consola del navegador y no bloquean nada.
 * Cuando la consola esté limpia en todas las vistas, cambiar CSP_ENFORCE a `true`.
 */
const CSP_ENFORCE = false;

const cspDirectives = [
  "default-src 'self'",
  // 'unsafe-eval' solo en `next dev` (React Refresh / Turbopack). El JSON-LD es un bloque de datos
  // (`type="application/ld+json"`) que el navegador no ejecuta: no le afecta script-src.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Google Fonts vía @import en app/globals.css. Quitar ambos hosts al migrar a next/font (Fase 3).
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // Portadas de Last.fm: misma lista que valida lib/server/lastfm.ts.
  `img-src 'self' data: blob: ${LASTFM_IMAGE_HOSTS.map((host) => `https://${host}`).join(" ")}`,
  // Mascotas: audio propio; ClippyJS empaqueta los sonidos como data: URI. Los tonos del arranque
  // son Web Audio (osciladores) y no necesitan nada.
  "media-src 'self' data: blob:",
  // /api/lastfm/, /api/contact/ y, en desarrollo, el websocket de HMR (mismo origen).
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Los navegadores ignoran (y avisan) esta directiva en Report-Only: solo se añade al aplicar la CSP.
  ...(CSP_ENFORCE ? ["upgrade-insecure-requests"] : []),
];

const securityHeaders = [
  {
    key: CSP_ENFORCE ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
    value: cspDirectives.join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Redundante con frame-ancestors, pero lo respetan navegadores antiguos.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
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
  // 301/308 de las URLs del WordPress antiguo (anexo 07 de la auditoría).
  async redirects() {
    return wordpressRedirects;
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
