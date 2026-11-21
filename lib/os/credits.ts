/**
 * Créditos de los proyectos (docs/arquitectura-os.md §6). Puro: el servidor resuelve las personas
 * (`content/people.ts`) y el cliente solo pinta. `people` llega por parámetro.
 */
import type { Ownership } from "@/content/projects";
import type { Locale } from "@/content/types";

export type PersonLike = { readonly name: string; readonly github?: string };
export type CreditInput = { readonly person: string; readonly role: Readonly<Record<Locale, string>>; readonly owner?: boolean; readonly minor?: boolean };

export type OsCredit = {
  name: string;
  role: string;
  /** Solo si la persona tiene GitHub (jdicans se menciona sin enlace a propósito). */
  href?: string;
  /** Es la propia Emmanuel (`edav`). */
  self: boolean;
  minor: boolean;
};

export const SELF_ID = "edav";

export function githubHref(person: PersonLike): string | undefined {
  return person.github ? `https://github.com/${person.github}` : undefined;
}

export function resolveCredits(credits: readonly CreditInput[] | undefined, people: Readonly<Record<string, PersonLike>>, locale: Locale): OsCredit[] {
  return (credits ?? []).flatMap((credit) => {
    const person = people[credit.person];
    if (!person) return [];
    const href = githubHref(person);
    return [{ name: person.name, role: credit.role[locale], ...(href ? { href } : {}), self: credit.person === SELF_ID, minor: credit.minor === true }];
  });
}

export type CreditBadge =
  | { kind: "own" }
  | { kind: "client" }
  | { kind: "co-created"; name: string; href?: string }
  | { kind: "collaboration"; name: string; href?: string };

/**
 * Badge de crédito: propio y cliente no nombran a nadie; cocreado y colaboración nombran al primer
 * coautor ajeno (los de menor protagonismo, solo si no hay otro). Sin coautor ajeno, vuelve a «propio».
 */
export function creditBadge(ownership: Ownership, credits: readonly OsCredit[]): CreditBadge {
  if (ownership === "own") return { kind: "own" };
  if (ownership === "client") return { kind: "client" };
  const others = credits.filter((credit) => !credit.self);
  const partner = others.find((credit) => !credit.minor) ?? others[0];
  if (!partner) return { kind: "own" };
  return { kind: ownership, name: partner.name, ...(partner.href ? { href: partner.href } : {}) };
}
