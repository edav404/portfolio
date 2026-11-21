import { DM_Mono, Space_Grotesk } from "next/font/google";

/**
 * Fuentes de la vista web, autoalojadas con next/font (sustituyen el `@import` de Google Fonts
 * de globals.css: sin petición a terceros ni CSS bloqueante). Se exponen como variables CSS que
 * leen los tokens `--font-sans` y `--font-mono` de app/styles/tokens.css.
 *
 * Pesos realmente usados en el CSS:
 * - Space Grotesk: 400 (texto), 600 (nav, enlaces, dd) y 700 (titulares, botones). Es variable en
 *   Google Fonts: un solo archivo con el eje de peso (antes se pedían 400/500/600/700 estáticos).
 * - DM Mono: 400 y 500 (etiquetas, eyebrows). Los `font: 700 … var(--font-mono)` ya se sintetizaban
 *   en negrita a partir de 500, igual que antes (DM Mono no tiene 700).
 *
 * El escritorio usa fuentes de sistema (Tahoma, Arial…): no necesita nada de aquí.
 *
 * Uso: `components/shell/document.tsx` pone `fontVariables` en el `className` de `<html>`, para que
 * las variables existan en `:root`, donde se declaran los tokens.
 */
export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

export const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-dm-mono",
});

/** Clases que declaran `--font-space-grotesk` y `--font-dm-mono`. */
export const fontVariables = `${spaceGrotesk.variable} ${dmMono.variable}`;
