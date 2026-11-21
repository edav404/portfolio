import Link from "next/link";
import { Icon } from "@/components/icons";
import { Cta, JsonLd, SectionHeading } from "@/components/ui";
import { pageFor } from "@/content/pages";
import { sortedPosts } from "@/content/posts";
import { profile } from "@/content/profile";
import { href, intlLocale } from "@/content/routes";
import { siteUrl } from "@/content/site";
import type { Locale } from "@/content/types";
import { format, uiFor } from "@/content/ui";
import { formatDate } from "@/lib/i18n/format";
import { absoluteUrl, buildMetadata } from "@/lib/metadata";

export function blogMetadata(locale: Locale) {
  const { seo } = pageFor(locale, "blog");
  return buildMetadata({ route: "blog", locale, title: seo.title, description: seo.description });
}

export function BlogView({ locale }: { locale: Locale }) {
  const page = pageFor(locale, "blog");
  const post = uiFor(locale, "post");
  const common = uiFor(locale, "common");
  const blogUrl = absoluteUrl(href("blog", locale));
  const schema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${blogUrl}#blog`,
    url: blogUrl,
    name: `${uiFor(locale, "nav").blog} · ${profile.name}`,
    description: page.seo.description,
    inLanguage: intlLocale[locale],
    author: { "@type": "Person", "@id": `${siteUrl}/#person`, name: profile.name, url: absoluteUrl(href("about", locale)) },
    blogPost: sortedPosts.map((item) => {
      const url = absoluteUrl(href("post", locale, { slug: item.slug }));
      return { "@type": "BlogPosting", "@id": `${url}#article`, url, headline: item.title[locale], datePublished: item.published, dateModified: item.updated };
    }),
  };
  return (
    <>
      <JsonLd data={schema} />
      <section className="page-hero section-shell">
        <p className="eyebrow">{page.hero.eyebrow}</p>
        <h1>{page.hero.title}</h1>
        <p>{page.hero.lead}</p>
      </section>
      <section className="section-shell section-block" id="articulos">
        <SectionHeading eyebrow={format(post.articleCount, { count: sortedPosts.length })} title={post.allArticles} />
        <div className="project-grid">
          {sortedPosts.map((item) => (
            <article className="project-card" key={item.slug.es}>
              <Link href={href("post", locale, { slug: item.slug })}>
                <div className="project-copy">
                  <p className="eyebrow">{item.tags[locale].join(" · ")} · <time dateTime={item.updated}>{formatDate(item.updated, locale)}</time></p>
                  <h3>{item.title[locale]}</h3>
                  <p>{item.description[locale]}</p>
                  <span className="text-link">{format(post.read, { title: item.title[locale] })} <Icon name="arrow" /></span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className="section-shell final-cta">
        <div><p className="eyebrow">{common.nextStep}</p><h2>{page.finalCta.title}</h2><p>{page.finalCta.copyBefore} <Link href={href("services", locale)}>{page.finalCta.copyLink}</Link> {page.finalCta.copyAfter}</p></div>
        <Cta href={href("contact", locale)}>{common.writeMe}</Cta>
      </section>
    </>
  );
}
