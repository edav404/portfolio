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

La versión pública se limita al rol, el programa, las contribuciones generales y las tecnologías: **sin nombres
de personas, volúmenes, número de usuarios, requisitos o iniciativas, ni herramientas en evaluación**.
La versión detallada vive solo en local (`private/nutresa-detallado.md`, ignorado por git) por si se autoriza publicarla.

Los testimonios son citas de clientes en español; la versión en inglés se marca como traducción (`translatedFrom`).

## Pendiente de confirmar

| # | Dato | Dónde | Valor provisional |
|---|---|---|---|
| 1 | Mes de inicio y fin en Servicios Nutresa | `experience.ts` | `2026` |
| 2 | Año de inicio como freelance | `experience.ts` | `2023` |
| 3 | Año de grado como Técnico Profesional en Sistemas | `experience.ts` | «Graduado» |
| 4 | Nivel de inglés | `cv-document.tsx` | «Lectura técnica y comunicación escrita» |
| 5 | Correo público para el CV | `profile.ts` | (vacío) |
| 6 | ¿El bot de recordatorios corre en n8n? ¿Qué IA usa? | `projects.ts` | n8n + «Speech-to-text AI» |
| 7 | ¿«jdicans» es su usuario de GitHub? | `people.ts` | sin enlace |
| 8 | ¿Se autoriza publicar el detalle de Nutresa (cifras, áreas, agente para BotCity)? | `experience.ts` | versión general |
