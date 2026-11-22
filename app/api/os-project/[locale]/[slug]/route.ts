import { osProjectSlugs } from "@/content/projects";
import { locales } from "@/content/types";
import { osProjectDetail } from "@/lib/os-project-detail";

// Detalle de un proyecto del catálogo del SO como JSON estático (uno por idioma y slug autorizado).
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((locale) => osProjectSlugs.map((slug) => ({ locale, slug })));
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const detail = locale === "es" || locale === "en" ? osProjectDetail(slug, locale) : null;
  if (!detail) return Response.json({ message: "No encontrado." }, { status: 404 });
  return Response.json(detail, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}
