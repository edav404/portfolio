import { NotFoundView } from "@/components/views/not-found";

// 404 de un notFound() explícito dentro de una página ES. Las URLs sin ruta (y los slugs
// rechazados por dynamicParams = false) los atiende app/global-not-found.tsx (§9.3).
export default function NotFound() {
  return <NotFoundView/>;
}
