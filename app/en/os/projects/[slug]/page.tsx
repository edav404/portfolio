import { OsProjectView, osProjectMetadata, osProjectParams } from "@/components/views/os";

// Mismos slugs que en ES (osProjectSlugs); uno fuera del catálogo da 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return osProjectParams();
}

export async function generateMetadata({ params }: PageProps<"/en/os/projects/[slug]">) {
  return osProjectMetadata("en", (await params).slug);
}

export default async function OsProjectPage({ params }: PageProps<"/en/os/projects/[slug]">) {
  return <OsProjectView locale="en" slug={(await params).slug}/>;
}
