import { BlogView, blogMetadata } from "@/components/views/blog";

// Adaptador fino: la vista vive en components/views/blog.tsx y recibe el idioma.
export const metadata = blogMetadata("es");

export default function BlogPage() {
  return <BlogView locale="es"/>;
}
