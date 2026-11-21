import Link from "next/link";
import type { ReactNode } from "react";
import type { Block } from "@/content/posts";
import type { Locale } from "@/content/types";
import { localizeInternalHref } from "@/lib/i18n/links";

/** Enlace en línea con la sintaxis Markdown `[texto](/ruta/)`. */
const INLINE_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Convierte el texto de un bloque en nodos, con `Link` para rutas internas y `<a>` para externas. */
function renderInline(text: string, locale: Locale): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_LINK)) {
    const [whole, label, href] = match;
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    nodes.push(
      href.startsWith("/")
        ? <Link key={index} href={localizeInternalHref(href, locale)}>{label}</Link>
        : <a key={index} href={href} target="_blank" rel="noreferrer">{label}</a>,
    );
    last = index + whole.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Texto plano (sin la sintaxis de enlaces), p. ej. para `articleBody` en JSON-LD. */
export function plainText(blocks: Block[]): string {
  const strip = (text: string) => text.replace(INLINE_LINK, "$1");
  return blocks.map((block) => (block.type === "ul" ? block.items.map(strip).join("\n") : strip(block.text))).join("\n\n");
}

/** Renderiza los bloques de `content/posts.ts` (H1 lo pone la página; aquí solo H2). */
export function PostBody({ blocks, locale }: { blocks: Block[]; locale: Locale }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "h2") return <h2 key={index}>{block.text}</h2>;
        if (block.type === "ul") return <ul key={index}>{block.items.map((item) => <li key={item}>{renderInline(item, locale)}</li>)}</ul>;
        return <p key={index}>{renderInline(block.text, locale)}</p>;
      })}
    </>
  );
}
