/**
 * Etiquetas de estado, autoría y tipo de proyecto (fuente única).
 *
 * Módulo aparte y sin dependencias para que lo compartan `content/projects.ts` (que también llega
 * al bundle cliente del escritorio) y `content/ui.ts` (solo servidor) sin duplicar textos ni meter
 * el microcopy completo en el cliente.
 */
export const projectStatusLabels = {
  delivered: { es: "Entregado", en: "Delivered" },
  live: { es: "En uso", en: "In use" },
  "in-development": { es: "En desarrollo", en: "In development" },
  academic: { es: "Académico", en: "Academic" },
} as const;

export const projectOwnershipLabels = {
  own: { es: "Proyecto propio", en: "Own project" },
  "co-created": { es: "Cocreado", en: "Co-created" },
  collaboration: { es: "Colaboración", en: "Collaboration" },
  client: { es: "Proyecto para cliente", en: "Client project" },
} as const;

export const projectKindLabels = {
  client: { es: "Clientes", en: "Clients" },
  personal: { es: "Personales", en: "Personal" },
  automation: { es: "Automatizaciones", en: "Automation" },
} as const;
