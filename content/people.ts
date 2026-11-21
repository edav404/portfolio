/** Personas con las que se comparte crédito en proyectos. */
export type Person = {
  id: string;
  name: string;
  /** Usuario de GitHub (sin @). */
  github?: string;
};

export const people = {
  edav: { id: "edav", name: "Emmanuel Dávila", github: "edav404" },
  lmilo: { id: "lmilo", name: "lmilo", github: "lmilo" },
  // Pendiente confirmar si "jdicans" es su usuario de GitHub.
  jdicans: { id: "jdicans", name: "jdicans" },
} as const satisfies Record<string, Person>;

export type PersonId = keyof typeof people;
