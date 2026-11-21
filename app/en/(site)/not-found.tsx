import { NotFoundView } from "@/components/views/not-found";

// 404 del árbol EN: lo pinta el catch-all `[...missing]` y cualquier notFound() de una página EN.
// En Next 16.4.6 el HTML inicial es el "error shell" (404 + noindex) y esta UI aparece al hidratar
// (docs/arquitectura-rutas.md §9.1 y §9.3).
export default function NotFound() {
  return <NotFoundView locale="en"/>;
}
