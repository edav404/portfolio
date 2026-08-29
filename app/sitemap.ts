import type { MetadataRoute } from "next";
import { projects } from "@/data/projects";
import { site } from "@/data/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/proyectos", "/servicios", "/sobre-mi", "/ahora", "/contacto"];
  return [...pages.map((path) => ({ url: `${site.domain}${path}`, lastModified: new Date(), changeFrequency: path === "" ? "monthly" as const : "yearly" as const, priority: path === "" ? 1 : 0.8 })), ...projects.map((project) => ({ url: `${site.domain}/proyectos/${project.slug}`, lastModified: new Date(`${project.year}-01-01`), changeFrequency: "yearly" as const, priority: 0.7 }))];
}
