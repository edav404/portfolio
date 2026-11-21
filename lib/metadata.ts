/**
 * Metadata de las páginas (docs/arquitectura-rutas.md §4.4, D8).
 *
 * Next fusiona la metadata en superficie: un `openGraph` de página reemplaza entero al del layout.
 * Por eso el layout raíz (`rootMetadata`) NO define canonical, openGraph ni twitter, y cada página
 * usa `buildMetadata`, que siempre devuelve el bloque completo con su URL, título e idioma.
 * Ver node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md (Merging).
 */
import type { Metadata, Viewport } from "next";
import { siteKeywords, titleTemplate, withTitleSuffix } from "@/content/pages";
import { profile } from "@/content/profile";
import { alternatesFor, hrefFor, hreflangFor, ogLocale, publishedLocales, type RouteRef } from "@/content/routes";
import { siteName, siteUrl } from "@/content/site";
import type { Locale } from "@/content/types";

/** Título por defecto (portada): nombre + posicionamiento único (CNT-01). */
export function defaultTitle(locale: Locale): string {
  return `${profile.name} | ${profile.headline[locale]}`;
}

/** URL absoluta del dominio canónico para una ruta interna (`/x/` → `https://edav.com.co/x/`). */
export function absoluteUrl(path: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export const siteViewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#167ea5", colorScheme: "light" };

/** Metadata del layout raíz de un idioma. Sin canonical, openGraph ni twitter (los pone cada página). */
export function rootMetadata(locale: Locale): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    title: { default: defaultTitle(locale), template: titleTemplate },
    description: profile.seoDescription[locale],
    applicationName: siteName,
    authors: [{ name: profile.name, url: siteUrl }],
    creator: profile.name,
    keywords: [...siteKeywords[locale]],
  };
}

export type MetadataImage = { url: string; alt: string; width?: number; height?: number };

export type BuildMetadataOptions = RouteRef & {
  locale: Locale;
  /** Título de la página; pasa por la plantilla "%s | Emmanuel Dávila" salvo con `absoluteTitle`. */
  title: string;
  absoluteTitle?: boolean;
  description: string;
  image?: MetadataImage;
  type?: "website" | "article";
  article?: { publishedTime: string; modifiedTime?: string; tags?: readonly string[] };
  /** `false` → noindex (también si el idioma aún no está publicado). */
  index?: boolean;
  /** Canonical hacia otra ruta (p. ej. `/classic/` → portada). */
  canonicalTo?: RouteRef;
};

/**
 * Metadata completa de una página: canonical propio, hreflang (solo cuando hay más de un idioma
 * publicado para esa ruta), `openGraph` y `twitter` con su URL y título, y robots.
 */
export function buildMetadata(options: BuildMetadataOptions): Metadata {
  const { locale, title, absoluteTitle = false, description, image, type = "website", article, index = true } = options;
  const path = hrefFor(options, locale);
  const canonical = options.canonicalTo ? hrefFor(options.canonicalTo, locale) : path;
  const fullTitle = absoluteTitle ? title : withTitleSuffix(title);
  const others = Object.keys(alternatesFor(options)).filter((other) => other !== locale) as Locale[];
  const images = image ? [{ ...image, url: absoluteUrl(image.url) }] : undefined;
  const indexable = index && publishedLocales.includes(locale);
  const aboutUrl = absoluteUrl(hrefFor({ route: "about" }, locale));

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    ...(article ? { authors: [{ name: profile.name, url: aboutUrl }] } : {}),
    alternates: {
      canonical,
      // Hreflang solo cuando la ruta existe publicada en más de un idioma (P9); hasta entonces nada.
      ...(others.length > 0 ? { languages: hreflangFor(options) } : {}),
    },
    openGraph: {
      type,
      // Igual que el canonical: con `canonicalTo`, la página se comparte como su destino.
      url: canonical,
      siteName,
      title: fullTitle,
      description,
      locale: ogLocale[locale],
      ...(others.length > 0 ? { alternateLocale: others.map((other) => ogLocale[other]) } : {}),
      ...(images ? { images } : {}),
      ...(article ? { publishedTime: article.publishedTime, modifiedTime: article.modifiedTime, authors: [aboutUrl], tags: article.tags ? [...article.tags] : undefined } : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, ...(images ? { images } : {}) },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
}
