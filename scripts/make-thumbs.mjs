// Genera miniaturas WebP (<= 480 px de ancho) de las capturas de proyectos para la galería del SO.
// Uso: node scripts/make-thumbs.mjs   (usa `sharp`, que Next ya instala; no es dependencia directa).
// Entrada: public/images/projects/*.{png,jpg}   Salida: public/images/projects/thumbs/<nombre>.webp
// Los originales no se tocan (los usa la web pública). Convención: lib/os/thumbs.ts → thumbPath().
import { readdir, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const WIDTH = 480;
const TARGET_BYTES = 25 * 1024;
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/images/projects");
const out = path.join(dir, "thumbs");
await mkdir(out, { recursive: true });

let total = 0;
for (const file of (await readdir(dir)).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort()) {
  const name = file.replace(/\.[^.]+$/, "");
  // Baja la calidad por pasos hasta cumplir el objetivo de peso (mínimo 40).
  let buf;
  for (let quality = 82; quality >= 40; quality -= 6) {
    buf = await sharp(path.join(dir, file)).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality, effort: 6 }).toBuffer();
    if (buf.length <= TARGET_BYTES) break;
  }
  await sharp(buf).toFile(path.join(out, `${name}.webp`));
  total += buf.length;
  const flag = buf.length > TARGET_BYTES ? "  (supera el objetivo)" : "";
  console.log(`${name}.webp  ${(buf.length / 1024).toFixed(1)} KB  (original ${((await stat(path.join(dir, file))).size / 1024).toFixed(0)} KB)${flag}`);
}
console.log(`Total: ${(total / 1024).toFixed(1)} KB`);

// Hoja de sprites de la mascota: WebP con alfa (el PNG original se conserva como alternativa en `image-set()`).
const sprite = path.resolve(dir, "../edav-clippy-sprites");
const spriteInfo = await sharp(`${sprite}.png`).webp({ quality: 82, alphaQuality: 100, effort: 6 }).toFile(`${sprite}.webp`);
console.log(`edav-clippy-sprites.webp  ${(spriteInfo.size / 1024).toFixed(0)} KB`);
