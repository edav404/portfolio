# Contenido del portafolio

Fuente única de contenido, bilingüe (ES principal, EN secundario). Ambas versiones del sitio
(`/os` y `/classic`) y el CV en PDF leen de aquí. **Para cambiar un texto, edítalo solo en `content/`.**

| Archivo | Contenido |
|---|---|
| `content/profile.ts` | Nombre, titular, bio, enfoque, contacto, cifras y habilidades. |
| `content/experience.ts` | Experiencia laboral y formación (línea de tiempo + CV). |
| `content/projects.ts` | Proyectos de clientes, personales y automatizaciones, con créditos y estado. |
| `content/services.ts` | Servicios y testimonios. |
| `content/posts.ts` | Artículos del blog (migrados de WordPress y actualizados). |
| `content/people.ts` | Colaboradores a los que se da crédito (lmilo, jdicans). |
| `lib/cv/cv-document.tsx` | Plantilla del CV en PDF. |

## CV en PDF

Se genera en cada build desde `content/` (siempre sincronizado con la web):

- `/cv/emmanuel-davila-cv-es.pdf`
- `/cv/emmanuel-davila-cv-en.pdf`

Incluye el WhatsApp público, LinkedIn, GitHub y la web; no incluye dirección física.
El correo aparece solo si se define `profile.contact.email`. Tras cambiar `content/`, revisar ambos PDF.

## Proyectos: tipos y créditos

| Proyecto | Tipo | Relación | Créditos |
|---|---|---|---|
| Vaulto | Personal | Cocreado | edav + lmilo (cofundadores) |
| Encorely | Personal | Cocreado | lmilo + edav + jdicans (cocreadores; jdicans con menor protagonismo visual) |
| Motila | Personal | Colaboración | **Proyecto de lmilo**; edav colabora en funcionalidades y redes (Facebook, TikTok) |
| Bot de recordatorios con IA | Automatización | Propio | edav |
| CiviCoin | Personal (académico) | Propio | edav |
| 12 proyectos de clientes | Cliente | Para cliente | edav (The Brant: apoyo como tercero) |

Los personales no tienen capturas públicas (repos privados): la Fase 4 diseñará portadas propias.

## Confidencialidad (Servicios Nutresa)

Se redacta como un CV: logros, alcance y propuestas, **sin nombres de personas, IDs internos, grupos de
acceso ni datos del negocio**.
La versión detallada vive solo en local (`private/nutresa-detallado.md`, ignorado por git) por si se autoriza publicarla.

Los testimonios son citas de clientes en español; la versión en inglés se marca como traducción (`translatedFrom`).

## Datos confirmados

Confirmado (2026-11-20): técnico profesional graduado en 2026 · tecnólogo con grado previsto en marzo de 2027 · Servicios Nutresa del 1 jul. al 31 dic. 2026 · freelance desde 2023 · inglés B2 (MCER) ·
correo `contacto@edav.com.co` · bot en n8n con Groq (nivel gratuito) · jdicans se menciona sin enlace ·
Nutresa redactado como un CV normal (logros, propuestas y aprendizaje autodidacta, sin nombres ni IDs internos).
