import type { ReactNode, SVGProps } from "react";

/** Props comunes de los iconos del SO. Decorativos por defecto (aria-hidden);
 *  con `title` pasan a role="img" con nombre accesible. Sin dependencias. */
export type OsIconProps = Omit<SVGProps<SVGSVGElement>, "children" | "title"> & {
  size?: number | string;
  title?: string;
};

export function SvgBase({
  size,
  title,
  viewBox,
  children,
  ...rest
}: OsIconProps & { viewBox: string; children: ReactNode }) {
  const labelled = Boolean(title);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={size}
      height={size}
      focusable="false"
      {...(labelled ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
      {...rest}
    >
      {labelled ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** Colores: variables --c-ico-* de app/styles/tokens.css (:root). */
export const ico = {
  line: "var(--c-ico-line)",
  yellow: "var(--c-ico-yellow)",
  yellowDark: "var(--c-ico-yellow-dark)",
  yellowLight: "var(--c-ico-yellow-light)",
  blue: "var(--c-ico-blue)",
  blueDark: "var(--c-ico-blue-dark)",
  blueLight: "var(--c-ico-blue-light)",
  green: "var(--c-ico-green)",
  greenDark: "var(--c-ico-green-dark)",
  greenLight: "var(--c-ico-green-light)",
  red: "var(--c-ico-red)",
  redDark: "var(--c-ico-red-dark)",
  paper: "var(--c-ico-paper)",
  paperShade: "var(--c-ico-paper-shade)",
  gray: "var(--c-ico-gray)",
  grayLight: "var(--c-ico-gray-light)",
  screen: "var(--c-ico-screen)",
  glow: "var(--c-ico-screen-glow)",
  shadow: "var(--c-ico-shadow)",
} as const;
