import { describe, expect, it } from "vitest";
import { people } from "@/content/people";
import { projects } from "@/content/projects";
import { creditBadge, githubHref, resolveCredits } from "@/lib/os/credits";

const role = { es: "Rol", en: "Role" };

describe("resolveCredits", () => {
  it("lmilo tiene enlace a GitHub; jdicans no", () => {
    const credits = resolveCredits(
      [{ person: "lmilo", role }, { person: "edav", role }, { person: "jdicans", role, minor: true }],
      people,
      "es",
    );
    const byName = Object.fromEntries(credits.map((credit) => [credit.name, credit]));
    expect(byName.lmilo.href).toBe("https://github.com/lmilo");
    expect(byName.jdicans.href).toBeUndefined();
    expect("href" in byName.jdicans).toBe(false);
    expect(byName["Emmanuel Dávila"].self).toBe(true);
    expect(byName.lmilo.self).toBe(false);
    expect(byName.jdicans.minor).toBe(true);
  });

  it("resuelve el rol en el idioma pedido y descarta personas desconocidas", () => {
    const credits = resolveCredits([{ person: "lmilo", role: { es: "Creador", en: "Creator" } }, { person: "nadie", role }], people, "en");
    expect(credits).toHaveLength(1);
    expect(credits[0].role).toBe("Creator");
    expect(resolveCredits(undefined, people, "es")).toEqual([]);
  });

  it("githubHref solo existe con usuario de GitHub", () => {
    expect(githubHref(people.lmilo)).toBe("https://github.com/lmilo");
    expect(githubHref(people.jdicans)).toBeUndefined();
  });
});

describe("creditBadge", () => {
  const lmilo = { name: "lmilo", role: "x", href: "https://github.com/lmilo", self: false, minor: false };
  const jdicans = { name: "jdicans", role: "x", self: false, minor: true };
  const me = { name: "Emmanuel Dávila", role: "x", self: true, minor: false };

  it("propio y cliente no nombran a nadie", () => {
    expect(creditBadge("own", [lmilo])).toEqual({ kind: "own" });
    expect(creditBadge("client", [lmilo])).toEqual({ kind: "client" });
  });

  it("cocreado nombra al coautor con enlace", () => {
    expect(creditBadge("co-created", [me, lmilo, jdicans])).toEqual({ kind: "co-created", name: "lmilo", href: "https://github.com/lmilo" });
  });

  it("colaboración con jdicans: nombre sin enlace", () => {
    const badge = creditBadge("collaboration", [me, jdicans]);
    expect(badge).toEqual({ kind: "collaboration", name: "jdicans" });
    expect("href" in badge).toBe(false);
  });

  it("sin coautor ajeno cae a propio", () => {
    expect(creditBadge("co-created", [me])).toEqual({ kind: "own" });
  });
});

describe("contenido real", () => {
  it("cada crédito apunta a una persona de people", () => {
    for (const project of projects) {
      for (const credit of project.credits ?? []) expect(Object.keys(people), `${project.slug}: ${credit.person}`).toContain(credit.person);
    }
  });

  it("edav es propio (self) y el resto no", () => {
    expect(people.edav.id).toBe("edav");
    const credits = resolveCredits([{ person: "edav", role }, { person: "lmilo", role }], people, "es");
    expect(credits.map((c) => c.self)).toEqual([true, false]);
  });
});
