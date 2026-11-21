import type { Ownership } from "@/content/projects";
import { format } from "@/content/format";
import { creditBadge, type OsCredit } from "@/lib/os/credits";
import type { OsCopy } from "../types";
import styles from "./apps.module.css";

type Props = { ownership: Ownership; credits: readonly OsCredit[]; copy: OsCopy["project"] };

/**
 * Badge de crédito (docs/arquitectura-os.md §6): propio, cocreado (con enlace a GitHub del coautor),
 * colaboración (nombre sin enlace) o cliente. El servidor resuelve las personas; aquí solo se pinta.
 */
export function CreditBadge({ ownership, credits, copy }: Props) {
  const badge = creditBadge(ownership, credits);
  if (badge.kind === "own") return <span className={styles.badge}>{copy.badgeOwn}</span>;
  if (badge.kind === "client") return <span className={styles.badge}>{copy.badgeClient}</span>;
  const template = badge.kind === "co-created" ? copy.badgeCoCreated : copy.badgeCollaboration;
  const [before, after = ""] = template.split("{name}");
  const label = badge.href ? `@${badge.name}` : badge.name;
  return (
    <span className={styles.badge}>
      {before}
      {badge.href ? (
        <a href={badge.href} target="_blank" rel="noopener noreferrer" aria-label={format(copy.githubLink, { name: badge.name })}>{label}</a>
      ) : label}
      {after}
    </span>
  );
}
