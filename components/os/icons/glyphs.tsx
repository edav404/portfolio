import type { ReactNode } from "react";
import { SvgBase, type OsIconProps } from "./base";

/**
 * Glifos de sistema de EDAV OS (cromo de ventana, bandeja, Inicio). Trazo y
 * relleno con `currentColor`: el color lo manda el CSS del contenedor (os.css).
 * Server components, sin dependencias. Decorativos salvo que se pase `title`.
 */
export type OsGlyphName =
  | "close"
  | "minimize"
  | "maximize"
  | "restore"
  | "back"
  | "chevron"
  | "volume"
  | "volume-off"
  | "network"
  | "language"
  | "start"
  | "crt";

const line = { fill: "none", stroke: "currentColor", strokeLinecap: "square", strokeLinejoin: "miter" } as const;

/* Caja 10x10 para los botones de ventana (trazo de 2 px, esquinas rectas como en el cromo Luna) */
const art = {
  close: { box: "0 0 10 10", node: <path d="m1.5 1.5 7 7m0-7-7 7" {...line} strokeWidth="2" /> },
  minimize: { box: "0 0 10 10", node: <path d="M1.5 8.5h5" {...line} strokeWidth="2.4" /> },
  maximize: {
    box: "0 0 10 10",
    node: (
      <>
        <rect x="1.2" y="1.2" width="7.6" height="7.6" {...line} strokeWidth="1.4" />
        <path d="M1.2 2h7.6" {...line} strokeWidth="2" />
      </>
    ),
  },
  restore: {
    box: "0 0 10 10",
    node: (
      <>
        <path d="M3.5 3.2V1.5h5.2v5.2H7" {...line} strokeWidth="1.3" />
        <rect x="1.3" y="3.6" width="5.2" height="5.2" {...line} strokeWidth="1.3" />
        <path d="M1.3 4.3h5.2" {...line} strokeWidth="1.8" />
      </>
    ),
  },
  /* Cajas de 16 px para el resto */
  back: { box: "0 0 16 16", node: <path d="m10 3-5 5 5 5" {...line} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /> },
  chevron: { box: "0 0 16 16", node: <path d="m6 3 5 5-5 5" {...line} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /> },
  volume: {
    box: "0 0 16 16",
    node: (
      <>
        <path d="M2 6h2.5L8 3v10l-3.5-3H2z" fill="currentColor" />
        <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6.5 6.5 0 0 1 0 9" {...line} strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
  "volume-off": {
    box: "0 0 16 16",
    node: (
      <>
        <path d="M2 6h2.5L8 3v10l-3.5-3H2z" fill="currentColor" />
        <path d="m10.5 6 4 4m0-4-4 4" {...line} strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  network: {
    box: "0 0 16 16",
    node: (
      <>
        <rect x="1.5" y="2.5" width="8" height="6" rx=".8" {...line} strokeWidth="1.4" strokeLinejoin="round" />
        <rect x="6.5" y="7.5" width="8" height="6" rx=".8" fill="currentColor" />
        <path d="M5.5 8.5v2.5h1" {...line} strokeWidth="1.2" />
      </>
    ),
  },
  language: {
    box: "0 0 16 16",
    node: (
      <>
        <circle cx="8" cy="8" r="6" {...line} strokeWidth="1.4" />
        <path d="M2 8h12M8 2c-2.5 2-2.5 10 0 12M8 2c2.5 2 2.5 10 0 12" {...line} strokeWidth="1.2" />
      </>
    ),
  },
  /* Marca de Inicio: ver también EdavLogo (logo.tsx); este es el glifo monocromo */
  start: {
    box: "0 0 16 16",
    node: <path d="M8 1.5 14.5 8 8 14.5 1.5 8z" fill="currentColor" />,
  },
  crt: {
    box: "0 0 16 16",
    node: (
      <>
        <rect x="1.5" y="2.5" width="13" height="9" rx="1.2" {...line} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M4 5.5h8M4 8h8M5.5 13.5h5" {...line} strokeWidth="1.2" />
      </>
    ),
  },
} satisfies Record<OsGlyphName, { box: string; node: ReactNode }>;

export function OsGlyph({ name, size, title, ...rest }: OsIconProps & { name: OsGlyphName }) {
  const { box, node } = art[name];
  return (
    <SvgBase viewBox={box} size={size} title={title} {...rest}>
      {node}
    </SvgBase>
  );
}

export const osGlyphNames = Object.keys(art) as OsGlyphName[];
