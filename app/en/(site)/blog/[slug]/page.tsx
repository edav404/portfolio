import { PostView, postMetadata, postParams } from "@/components/views/post";

// Solo existen los slugs EN de `content/posts.ts`; cualquier otro cae en el catch-all EN (404).
export const dynamicParams = false;

export function generateStaticParams() {
  return postParams("en");
}

export async function generateMetadata({ params }: PageProps<"/en/blog/[slug]">) {
  return postMetadata("en", (await params).slug);
}

export default async function PostPage({ params }: PageProps<"/en/blog/[slug]">) {
  return <PostView locale="en" slug={(await params).slug}/>;
}
