import { notFound } from "next/navigation";

// Cualquier URL bajo /en/ sin página propia: 404 con la navegación EN (§9.3, punto 2).
// Dinámico para no crear una entrada ISR por cada URL inventada.
export const dynamic = "force-dynamic";

export default function MissingPage() {
  notFound();
}
