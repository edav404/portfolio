import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cta, JsonLd } from "@/components/ui";
import { getPostBySlug, posts } from "@/content/posts";
import { profile } from "@/content/profile";
import { siteName, siteUrl } from "@/content/site";
import { formatPostDate } from "../format-date";
import { PostBody, plainText } from "../post-body";

// Solo existen los slugs ES de `content/posts.ts`; cualquier otro da 404 sin renderizar en runtime.
// La versión EN (`/en/blog/<slug-en>/`) llega con la i18n de la Fase 3.
export const dynamicParams = false;

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug.es }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPostBySlug((await params).slug, "es");
  if (!post) return {};
  const path = `/blog/${post.slug.es}/`;
  // Título corto con " | edav" en vez de la plantilla " | Emmanuel Dávila" (CNT-06: ≤ 60 caracteres).
  const title = `${post.seoTitle.es} | edav`;
  return {
    title: { absolute: title },
    description: post.description.es,
    authors: [{ name: profile.name, url: `${siteUrl}/sobre-mi/` }],
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title,
      description: post.description.es,
      locale: "es_CO",
      siteName,
      publishedTime: post.published,
      modifiedTime: post.updated,
      authors: [`${siteUrl}/sobre-mi/`],
      tags: post.tags.es,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = getPostBySlug((await params).slug, "es");
  if (!post) notFound();
  const url = `${siteUrl}/blog/${post.slug.es}/`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: url,
    url,
    headline: post.title.es,
    description: post.description.es,
    datePublished: post.published,
    dateModified: post.updated,
    inLanguage: "es-CO",
    keywords: post.tags.es.join(", "),
    articleBody: plainText(post.body.es),
    // `@id` alineado con el Person del layout cuando se complete el @graph (SEO-08, Fase 7).
    author: { "@type": "Person", "@id": `${siteUrl}/#person`, name: profile.name, url: `${siteUrl}/sobre-mi/` },
    publisher: { "@type": "Person", "@id": `${siteUrl}/#person`, name: profile.name, url: siteUrl },
  };
  return (
    <>
      <JsonLd data={schema} />
      <article>
        <header className="project-hero section-shell">
          <nav className="breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link><span>/</span><Link href="/blog/">Blog</Link><span>/</span><span aria-current="page">{post.title.es}</span>
          </nav>
          <p className="eyebrow">{post.tags.es.join(" · ")}</p>
          <h1>{post.title.es}</h1>
          <p>{post.description.es}</p>
          <p>
            Por <Link href="/sobre-mi/" rel="author">{profile.name}</Link> · {profile.headline.es} ·{" "}
            Actualizado el <time dateTime={post.updated}>{formatPostDate(post.updated)}</time>
          </p>
        </header>
        <div className="section-shell case-grid">
          <aside>
            <dl>
              <div><dt>Autor</dt><dd><Link href="/sobre-mi/">{profile.name}</Link></dd></div>
              <div><dt>Publicado</dt><dd><time dateTime={post.published}>{formatPostDate(post.published)}</time></dd></div>
              <div><dt>Actualizado</dt><dd><time dateTime={post.updated}>{formatPostDate(post.updated)}</time></dd></div>
              <div><dt>Temas</dt><dd>{post.tags.es.join(", ")}</dd></div>
            </dl>
          </aside>
          <div className="case-content">
            <section><PostBody blocks={post.body.es} /></section>
          </div>
        </div>
        <section className="section-shell final-cta">
          <div><p className="eyebrow">Siguiente paso</p><h2>¿Hablamos de tu proyecto?</h2><p>Sitios a la medida, WordPress, Shopify y automatización de procesos.</p></div>
          <Cta href="/contacto/">Escríbeme</Cta>
        </section>
      </article>
    </>
  );
}
