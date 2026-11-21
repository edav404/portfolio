import type { ReactNode } from "react";
import { ico, SvgBase, type OsIconProps } from "./base";

/**
 * Iconos de aplicación de EDAV OS: SVG propios de 32 px (se escalan a 16/24/48).
 * Relleno plano a color, luz arriba a la izquierda (reflejo claro), contorno
 * oscuro de 1 px y sombra suave. Server components, sin dependencias y sin ids
 * (nada de degradados por referencia): funcionan también dentro de contenedores
 * ocultos. Decorativos (aria-hidden) salvo que se pase `title`.
 */
export type XpIconName =
  | "welcome" // Mi PC / Bienvenida
  | "projects" // Proyectos / galería (carpeta)
  | "services"
  | "contact"
  | "media" // Multimedia
  | "terminal"
  | "properties"
  | "trash" // Papelera (opcional)
  | "cv"
  | "about"
  | "help";

const stroke = { stroke: ico.line, strokeWidth: 1, strokeLinejoin: "round", strokeLinecap: "round" } as const;
const drop = <ellipse cx="16" cy="29" rx="11" ry="1.8" fill={ico.shadow} />;

const art: Record<XpIconName, ReactNode> = {
  welcome: (
    <>
      {drop}
      <rect x="3.5" y="4.5" width="25" height="17" rx="2" fill={ico.grayLight} {...stroke} />
      <rect x="5.5" y="6.5" width="21" height="13" rx="1" fill={ico.blue} {...stroke} />
      <path d="M6 7h20v3.5C20 9 12 11 6 13z" fill={ico.blueLight} opacity=".85" />
      <path d="M11 22v3.5h10V22" fill={ico.gray} {...stroke} />
      <rect x="8" y="25.5" width="16" height="2.5" rx="1" fill={ico.grayLight} {...stroke} />
      <circle cx="16" cy="13" r="2.2" fill={ico.yellow} />
    </>
  ),
  projects: (
    <>
      {drop}
      <path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h7l2.5 2.5H27a1.5 1.5 0 0 1 1.5 1.5V24a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 24z" fill={ico.yellowDark} {...stroke} />
      <path d="M3.5 13.5A1.5 1.5 0 0 1 5 12h22a1.5 1.5 0 0 1 1.5 1.5V24a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 24z" fill={ico.yellow} {...stroke} />
      <path d="M5 13h22v2C20 14 11 16 4.5 17.5V14z" fill={ico.yellowLight} opacity=".9" />
      <rect x="17" y="17.5" width="8" height="5" rx=".8" fill={ico.paper} {...stroke} />
      <path d="m18.2 21.4 2-2 1.6 1.4 1.2-1 1 1.6" fill="none" stroke={ico.blueDark} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  services: (
    <>
      {drop}
      <path d="M14 4.5h4l.7 3a9 9 0 0 1 2.3 1.3l3-1 2 3.4-2.3 2.1a9 9 0 0 1 0 2.6l2.3 2.1-2 3.4-3-1a9 9 0 0 1-2.3 1.3l-.7 3h-4l-.7-3a9 9 0 0 1-2.3-1.3l-3 1-2-3.4 2.3-2.1a9 9 0 0 1 0-2.6L6 12.2l2-3.4 3 1a9 9 0 0 1 2.3-1.3z" fill={ico.blue} {...stroke} />
      <path d="m12 7.5 2-.7h4l.5 2.2c-3 .3-5.6 1.1-7.6 2.5z" fill={ico.blueLight} opacity=".9" />
      <circle cx="16" cy="15.5" r="3.6" fill={ico.paper} {...stroke} />
      <circle cx="16" cy="15.5" r="1.4" fill={ico.yellow} />
    </>
  ),
  contact: (
    <>
      {drop}
      <rect x="3.5" y="7.5" width="25" height="17" rx="2" fill={ico.paper} {...stroke} />
      <path d="m4 8.5 12 9.5 12-9.5" fill="none" {...stroke} />
      <path d="m4 24 8.5-8M28 24l-8.5-8" fill="none" stroke={ico.gray} strokeWidth="1" strokeLinecap="round" />
      <rect x="20" y="10.5" width="6" height="4.5" rx=".8" fill={ico.red} {...stroke} />
    </>
  ),
  media: (
    <>
      {drop}
      <circle cx="14" cy="15" r="11" fill={ico.grayLight} {...stroke} />
      <path d="M14 4a11 11 0 0 1 11 11h-3a8 8 0 0 0-8-8z" fill={ico.paper} opacity=".8" />
      <circle cx="14" cy="15" r="4" fill={ico.blueLight} {...stroke} />
      <circle cx="14" cy="15" r="1.4" fill={ico.paper} {...stroke} />
      <path d="M24 8.5v11a2.5 2 0 1 1-1.5-1.8V11.2l-5 1.3" transform="translate(2 2)" fill={ico.green} {...stroke} />
    </>
  ),
  terminal: (
    <>
      {drop}
      <rect x="3.5" y="5.5" width="25" height="20" rx="2" fill={ico.screen} {...stroke} />
      <path d="M3.5 7.5a2 2 0 0 1 2-2h21a2 2 0 0 1 2 2V10h-25z" fill={ico.gray} {...stroke} />
      <path d="m8 14.5 4 3-4 3" fill="none" stroke={ico.glow} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 21h6" stroke={ico.glow} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  properties: (
    <>
      {drop}
      <rect x="3.5" y="4.5" width="25" height="17" rx="2" fill={ico.grayLight} {...stroke} />
      <rect x="5.5" y="6.5" width="21" height="13" rx="1" fill={ico.screen} {...stroke} />
      <path d="m8 16.5 3.5-4 3 3 3-5 4 6" fill="none" stroke={ico.glow} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 22v3h10v-3" fill={ico.gray} {...stroke} />
      <rect x="8" y="25" width="16" height="2.5" rx="1" fill={ico.grayLight} {...stroke} />
      <circle cx="24" cy="24" r="4.5" fill={ico.yellow} {...stroke} />
      <path d="M22 24h4M24 22v4" stroke={ico.line} strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  trash: (
    <>
      {drop}
      <path d="M8 9.5h16l-1.5 16.5a1.5 1.5 0 0 1-1.5 1.3h-10a1.5 1.5 0 0 1-1.5-1.3z" fill={ico.grayLight} {...stroke} />
      <path d="M8.5 12h5l-1 14h-2.5a1 1 0 0 1-1-.9z" fill={ico.paper} opacity=".7" />
      <rect x="5.5" y="6.5" width="21" height="3" rx="1.2" fill={ico.gray} {...stroke} />
      <path d="M12.5 6.5V5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v1.5" fill="none" {...stroke} />
      <path d="M12.5 13v11M16 13v11M19.5 13v11" stroke={ico.gray} strokeWidth="1" strokeLinecap="round" />
    </>
  ),
  cv: (
    <>
      {drop}
      <path d="M7.5 3h12l6 6v18a1.5 1.5 0 0 1-1.5 1.5H7.5A1.5 1.5 0 0 1 6 27V4.5A1.5 1.5 0 0 1 7.5 3z" fill={ico.paper} {...stroke} />
      <path d="M19.5 3v6.5H26z" fill={ico.paperShade} {...stroke} />
      <rect x="9" y="11.5" width="5" height="5.5" rx=".8" fill={ico.blue} {...stroke} />
      <path d="M16 12.5h6M16 15.5h6M9 20h13M9 23h13" stroke={ico.gray} strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  about: (
    <>
      {drop}
      <rect x="3.5" y="6.5" width="25" height="19" rx="2" fill={ico.paper} {...stroke} />
      <path d="M3.5 8.5a2 2 0 0 1 2-2h21a2 2 0 0 1 2 2V11h-25z" fill={ico.blue} {...stroke} />
      <circle cx="10.5" cy="16" r="2.6" fill={ico.yellow} {...stroke} />
      <path d="M6 23a4.5 4 0 0 1 9 0z" fill={ico.blue} {...stroke} />
      <path d="M18 15h7M18 18.5h7M18 22h5" stroke={ico.gray} strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  help: (
    <>
      {drop}
      <circle cx="16" cy="15" r="12" fill={ico.blue} {...stroke} />
      <path d="M8 10a10 10 0 0 1 16 0c-5-2.5-11-2.5-16 0z" fill={ico.blueLight} opacity=".8" />
      <path d="M12.5 12.5a3.5 3.5 0 1 1 5 3.1c-1 .6-1.5 1.2-1.5 2.4" fill="none" stroke={ico.paper} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="22" r="1.4" fill={ico.paper} />
    </>
  ),
};

/** Un solo componente: `<XpIcon name="projects" size={48} />`. Nombres en `xpIconNames`. */
export function XpIcon({ name, size = 32, title, ...rest }: OsIconProps & { name: XpIconName }) {
  return (
    <SvgBase viewBox="0 0 32 32" size={size} title={title} {...rest}>
      {art[name]}
    </SvgBase>
  );
}

export const xpIconNames = Object.keys(art) as XpIconName[];
