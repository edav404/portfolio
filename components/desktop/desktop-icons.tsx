import type { SVGProps } from "react";

export type DesktopIconName = "about" | "briefcase" | "contact" | "folder" | "music" | "power" | "services" | "terminal" | "welcome";

export function DesktopIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: DesktopIconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const drawing: Record<DesktopIconName, React.ReactNode> = {
    welcome: <><rect x="3" y="4" width="18" height="15" rx="1"/><path d="M3 8h18M8 22h8M12 19v3"/><path d="m8 12 2 2-2 2m4 0h4"/></>,
    folder: <><path d="M2.5 7h7l2-2h3l2 2h5v12h-19z"/><path d="M3 10h18"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="1"/><path d="M9 7V4h6v3M3 12h18M10 12v2h4v-2"/></>,
    services: <><path d="m14 4 6 6-10 10-6-6z"/><path d="m12 6 6 6M5 6l3-3 3 3M18 14l3 3-3 3"/></>,
    about: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    contact: <><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 7 9 6 9-6"/></>,
    music: <><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></>,
    terminal: <><rect x="2.5" y="4" width="19" height="16" rx="1"/><path d="m6 9 3 3-3 3m6 0h5"/></>,
    power: <><path d="M12 3v9"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/></>,
  };

  return <svg viewBox="0 0 24 24" aria-hidden="true" {...common} {...props}>{drawing[name]}</svg>;
}

export function PixelLogo({ small = false }: { small?: boolean }) {
  return <span className={small ? "os-pixel-logo is-small" : "os-pixel-logo"} aria-hidden="true"><i/><i/><i/><i/></span>;
}
