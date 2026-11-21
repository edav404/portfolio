import Link from "next/link";
import { notFound } from "next/navigation";
import { Cta, JsonLd } from "@/components/ui";
import { getPostBySlug, posts } from "@/content/posts";
import { profile } from "@/content/profile";
import { href, intlLocale } from "@/content/routes";
import { siteUrl } from "@/content/site";
import type { Locale } from "@/content/types";
import { uiFor } from "@/content/ui";
import { formatDate } from "@/lib/i18n/format";
import { absoluteUrl, buildMetadata } from "@/lib/metadata";
import { PostBody, plainText } from "./post-body";

/** Parámetros de `/blog/[slug]/` en un idioma (los slugs de post se traducen). */
export function postParams(locale: Locale) {
  return posts.map((post) => ({ slug: post.slug[locale] }));
}

export function postMetadata(locale: Locale, slug: string) {
  const post = getPostBySlug(slug, locale);
  if (!post) return {};
  return buildMetadata({
    route: "post", params: { slug: post.slug }, locale,
    // Título corto con " | edav" en vez de la plantilla " | Emmanuel Dávila" (CNT-06: ≤ 60 caracteres).
    title: `${post.seoTitle[locale]} | edav`, absoluteTitle: true,
    description: post.description[locale],
    type: "article",
    article: { publishedTime: post.published, modifiedTime: post.updated, tags: post.tags[locale] },
  });
}

export function PostView({ locale, slug }: { locale: Locale; slug: string }) {
  const post = getPostBySlug(slug, locale);
  if (!post) notFound();
  const copy = uiFor(locale, "post");
  const nav = uiFor(locale, "nav");
  const common = uiFor(locale, "common");
  const about = href("about", locale);
  const url = absoluteUrl(href("post", locale, { slug: post.slug }));
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: url,
    url,
    headline: post.title[locale],
    description: post.description[locale],
    datePublished: post.published,
    dateModified: post.updated,
    inLanguage: intlLocale[locale],
    keywords: post.tags[locale].join(", "),
    articleBody: plainText(post.body[locale]),
    // `@id` alineado con el Person del layout cuando se complete el @graph (SEO-08, Fase 7).
    author: { "@type": "Person", "@id": `${siteUrl}/#person`, name: profile.name, url: absoluteUrl(about) },
    publisher: { "@type": "Person", "@id": `${siteUrl}/#person`, name: profile.name, url: siteUrl },
  };
  return (
    <>
      <JsonLd data={schema} />
      <article>
        <header className="project-hero section-shell">
          <nav className="breadcrumbs" aria-label={uiFor(locale, "a11y").breadcrumbs}>
            <Link href={href("home", locale)}>{nav.home}</Link><span>/</span><Link href={href("blog", locale)}>{nav.blog}</Link><span>/</span><span aria-current="page">{post.title[locale]}</span>
          </nav>
          <p className="eyebrow">{post.tags[locale].join(" · ")}</p>
          <h1>{post.title[locale]}</h1>
          <p>{post.description[locale]}</p>
          <p>
            {copy.by} <Link href={about} rel="author">{profile.name}</Link> · {profile.headline[locale]} ·{" "}
            {copy.updatedOn} <time dateTime={post.updated}>{formatDate(post.updated, locale)}</time>
          </p>
        </header>
        <div className="section-shell case-grid">
          <aside>
            <dl>
              <div><dt>{copy.author}</dt><dd><Link href={about}>{profile.name}</Link></dd></div>
              <div><dt>{copy.published}</dt><dd><time dateTime={post.published}>{formatDate(post.published, locale)}</time></dd></div>
              <div><dt>{copy.updated}</dt><dd><time dateTime={post.updated}>{formatDate(post.updated, locale)}</time></dd></div>
              <div><dt>{copy.topics}</dt><dd>{post.tags[locale].join(", ")}</dd></div>
            </dl>
          </aside>
          <div className="case-content">
            <section><PostBody blocks={post.body[locale]} /></section>
          </div>
        </div>
        <section className="section-shell final-cta">
          <div><p className="eyebrow">{common.nextStep}</p><h2>{copy.nextTitle}</h2><p>{copy.nextCopy}</p></div>
          <Cta href={href("contact", locale)}>{common.writeMe}</Cta>
        </section>
      </article>
    </>
  );
}
