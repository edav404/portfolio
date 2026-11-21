import type { SVGProps } from "react";

type IconName = "arrow" | "code" | "download" | "folder" | "github" | "linkedin" | "mail" | "menu" | "music" | "spark" | "user" | "x";

const paths: Record<IconName, React.ReactNode> = {
  arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
  code: <><path d="m8 9-4 3 4 3"/><path d="m16 9 4 3-4 3"/><path d="m14 5-4 14"/></>,
  download: <><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></>,
  github: <path d="M9 19c-4.5 1.4-4.5-2.3-6.3-2.8m12.6 5.6v-3.5a3 3 0 0 0-.9-2.4c2.9-.3 5.9-1.4 5.9-6.4a5 5 0 0 0-1.3-3.4 4.6 4.6 0 0 0-.1-3.4s-1.1-.3-3.6 1.3a12.4 12.4 0 0 0-6.6 0C6.2 2.6 5.1 2.9 5.1 2.9a4.6 4.6 0 0 0-.1 3.4 5 5 0 0 0-1.3 3.4c0 5 3 6.1 5.9 6.4a3 3 0 0 0-.9 2.4v3.5"/>,
  linkedin: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V17M8 7.5v.01M12 17v-6.5M12 13.5a2.5 2.5 0 0 1 5 0V17"/></>,
  folder: <><path d="M3 6h7l2 2h9v10H3z"/><path d="M3 10h18"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  music: <><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></>,
  spark: <><path d="m12 3 1.4 4.1L17 9l-3.6 1.9L12 15l-1.4-4.1L7 9l3.6-1.9z"/><path d="m5 15 .8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8z"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  x: <path d="m6 6 12 12M18 6 6 18"/>,
};

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {paths[name]}
    </svg>
  );
}
