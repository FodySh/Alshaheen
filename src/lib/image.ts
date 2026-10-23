/** ضغط الصور في المتصفح قبل الرفع: أقصى بُعد 1920 بكسل بصيغة WebP. */
export async function compressImage(file: File, maxDim = 1920, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  return blob ?? file;
}

export const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp";
export const ACCEPT_DOCS = "image/jpeg,image/png,image/webp,application/pdf";
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function randomName(ext: string) {
  return `${crypto.randomUUID()}.${ext}`;
}

export function extFor(blob: Blob, fallbackName = "") {
  if (blob.type === "image/webp") return "webp";
  if (blob.type === "image/png") return "png";
  if (blob.type === "image/jpeg") return "jpg";
  if (blob.type === "application/pdf") return "pdf";
  const m = fallbackName.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "bin";
}
