import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Cta, JsonLd, SectionHeading } from "@/components/ui";
import { sortedPosts } from "@/content/posts";
import { profile } from "@/content/profile";
import { siteName, siteUrl } from "@/content/site";
import { formatPostDate } from "./format-date";

const description = "Artículos de Emmanuel Dávila sobre páginas web para negocios, SEO, WordPress, Shopify y automatización de procesos, escritos para dueños de negocio.";

export const metadata: Metadata = {
  title: "Blog: desarrollo web, SEO y automatización",
  description,
  alternates: { canonical: "/blog/" },
  openGraph: { type: "website", url: "/blog/", title: "Blog: desarrollo web, SEO y automatización | Emmanuel Dávila", description, locale: "es_CO", siteName },
};

export default function BlogPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${siteUrl}/blog/#blog`,
    url: `${siteUrl}/blog/`,
    name: "Blog de Emmanuel Dávila",
    description,
    inLanguage: "es-CO",
    author: { "@type": "Person", "@id": `${siteUrl}/#person`, name: profile.name, url: `${siteUrl}/sobre-mi/` },
    blogPost: sortedPosts.map((post) => ({
      "@type": "BlogPosting",
      "@id": `${siteUrl}/blog/${post.slug.es}/#article`,
      url: `${siteUrl}/blog/${post.slug.es}/`,
      headline: post.title.es,
      datePublished: post.published,
      dateModified: post.updated,
    })),
  };
  return (
    <>
      <JsonLd data={schema} />
      <section className="page-hero section-shell">
        <p className="eyebrow">C:\EDAV\BLOG</p>
        <h1>Notas sobre web, SEO y automatización.</h1>
        <p>Lo que suelo explicarles a los negocios antes de empezar un proyecto, escrito sin tecnicismos.</p>
      </section>
      <section className="section-shell section-block" id="articulos">
        <SectionHeading eyebrow={`${sortedPosts.length} artículos`} title="Todos los artículos." />
        <div className="project-grid">
          {sortedPosts.map((post) => (
            <article className="project-card" key={post.slug.es}>
              <Link href={`/blog/${post.slug.es}/`}>
                <div className="project-copy">
                  <p className="eyebrow">{post.tags.es.join(" · ")} · <time dateTime={post.updated}>{formatPostDate(post.updated)}</time></p>
                  <h3>{post.title.es}</h3>
                  <p>{post.description.es}</p>
                  <span className="text-link">Leer «{post.title.es}» <Icon name="arrow" /></span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className="section-shell final-cta">
        <div><p className="eyebrow">Siguiente paso</p><h2>¿Tienes un proyecto en mente?</h2><p>Revisa los <Link href="/servicios/">servicios</Link> o cuéntame qué necesitas.</p></div>
        <Cta href="/contacto/">Escríbeme</Cta>
      </section>
    </>
  );
}
