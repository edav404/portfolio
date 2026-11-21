import { ProjectView, projectMetadata, projectParams } from "@/components/views/project";

// Mismos slugs que en ES; uno desconocido cae en el catch-all EN (404).
export const dynamicParams = false;

export function generateStaticParams() {
  return projectParams();
}

export async function generateMetadata({ params }: PageProps<"/en/projects/[slug]">) {
  return projectMetadata("en", (await params).slug);
}

export default async function ProjectPage({ params }: PageProps<"/en/projects/[slug]">) {
  return <ProjectView locale="en" slug={(await params).slug}/>;
}
