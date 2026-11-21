import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { CvDocument } from "@/lib/cv/cv-document";
import { site } from "@/data/site";
import type { Locale } from "@/content/types";

// El CV se genera en build desde content/ y se sirve como archivo estático.
export const dynamic = "force-static";
export const dynamicParams = false;

const files: Record<string, Locale> = {
  "emmanuel-davila-cv-es.pdf": "es",
  "emmanuel-davila-cv-en.pdf": "en",
};

export function generateStaticParams() {
  return Object.keys(files).map((file) => ({ file }));
}

export async function GET(_request: Request, context: RouteContext<"/cv/[file]">) {
  const { file } = await context.params;
  const locale = files[file];
  if (!locale) return new Response("Not found", { status: 404 });

  // react-pdf tipa el elemento raíz como <Document>; CvDocument lo devuelve.
  const element = createElement(CvDocument, { locale, siteUrl: site.domain }) as Parameters<typeof renderToBuffer>[0];
  const pdf = await renderToBuffer(element);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${file}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
