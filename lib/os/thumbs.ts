/**
 * Miniatura de la galería por convención: `/images/projects/<n>.<ext>` → `/images/projects/thumbs/<n>.webp`
 * (generadas por `scripts/make-thumbs.mjs`, ≤ 480 px). Los originales los sigue usando la web pública.
 */
export function thumbPath(image: string): string {
  const match = /^(\/images\/projects\/)([^/]+)\.(?:png|jpe?g)$/i.exec(image);
  return match ? `${match[1]}thumbs/${match[2]}.webp` : image;
}
