import { ico, SvgBase, type OsIconProps } from "./icons/base";

/**
 * Logo propio de EDAV OS (UI-11): orbe de cuatro cuartos de disco separados por
 * una cruz, con las letras "ED". No es una bandera ni imita la marca Windows: es
 * un disco, con los colores en otro orden. Server component, sin dependencias.
 * Decorativo (aria-hidden) salvo que se pase `title`. Por debajo de 20 px se
 * omiten las letras (no se leerían).
 */
export function EdavLogo({ size = 24, title, showLetters, ...rest }: OsIconProps & { showLetters?: boolean }) {
  const px = typeof size === "number" ? size : 24;
  const letters = showLetters ?? px >= 20;
  return (
    <SvgBase viewBox="0 0 32 32" size={size} title={title} {...rest}>
      <ellipse cx="16" cy="29.5" rx="10" ry="1.6" fill={ico.shadow} />
      {/* Cuartos de disco (r 14,5; separación de 1,6 px) */}
      <path d="M14.6 14.6V1.6A14.5 14.5 0 0 0 1.6 14.6z" transform="translate(0 .4)" fill={ico.blue} />
      <path d="M17.4 14.6V1.6A14.5 14.5 0 0 1 30.4 14.6z" transform="translate(0 .4)" fill={ico.red} />
      <path d="M17.4 17.4h13A14.5 14.5 0 0 1 17.4 30.4z" transform="translate(0 .4)" fill={ico.yellow} />
      <path d="M14.6 17.4v13A14.5 14.5 0 0 1 1.6 17.4z" transform="translate(0 .4)" fill={ico.green} />
      {/* Reflejo (luz arriba a la izquierda) */}
      <path d="M4 10a13 13 0 0 1 9-7c-4 2-7 4.5-9 7z" fill={ico.paper} opacity=".55" />
      {letters ? (
        <g fill="none" strokeLinecap="square" strokeLinejoin="miter" transform="translate(0 .4)">
          <path d="M14 10.5H8.5v11H14M8.5 16H13" stroke={ico.line} strokeWidth="4.6" />
          <path d="M17 10.5h2.5a5.5 5.5 0 0 1 0 11H17z" stroke={ico.line} strokeWidth="4.6" strokeLinejoin="round" />
          <path d="M14 10.5H8.5v11H14M8.5 16H13" stroke={ico.paper} strokeWidth="2.4" />
          <path d="M17 10.5h2.5a5.5 5.5 0 0 1 0 11H17z" stroke={ico.paper} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
      ) : null}
    </SvgBase>
  );
}

/** Marca con texto visible "EDAV OS" (el texto es contenido real, no imagen).
 *  Estilo de `.xp-brand` en os.css. */
export function EdavWordmark({ size = 22, className, ...rest }: OsIconProps) {
  return (
    <span className={className ? `xp-brand ${className}` : "xp-brand"}>
      <EdavLogo size={size} {...rest} />
      <span className="xp-brand__name">EDAV OS</span>
    </span>
  );
}
