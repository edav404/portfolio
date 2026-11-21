import { PostView, postMetadata, postParams } from "@/components/views/post";

// Solo existen los slugs ES de `content/posts.ts`; cualquier otro da 404 sin renderizar en runtime.
export const dynamicParams = false;

export function generateStaticParams() {
  return postParams("es");
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">) {
  return postMetadata("es", (await params).slug);
}

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  return <PostView locale="es" slug={(await params).slug}/>;
}
