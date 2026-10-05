// Card photos only need a few hundred pixels; phone cameras produce 4000px
// images that turn into multi-megabyte base64 payloads. Everything captured
// or uploaded is cropped/scaled here before it goes into the request.
const MAX_SIDE = 1024;
const JPEG_QUALITY = 0.88;

/** Width / height of the photo guide shown while capturing (3:4 portrait, like a card photo). */
export const PHOTO_ASPECT = 3 / 4;

function toBase64Jpeg(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return dataUrl.split(",")[1] ?? dataUrl;
}

/**
 * Center-crops the source to `aspect` (width / height) and scales it down so
 * its longest side is at most MAX_SIDE. Matches what an `object-cover` box
 * with that aspect shows, so the saved photo is exactly what was on screen.
 */
export function cropToBase64(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  aspect: number,
): string {
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  if (sourceWidth / sourceHeight > aspect) cropWidth = sourceHeight * aspect;
  else cropHeight = sourceWidth / aspect;

  const scale = Math.min(1, MAX_SIDE / Math.max(cropWidth, cropHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cropWidth * scale);
  canvas.height = Math.round(cropHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(
    source,
    (sourceWidth - cropWidth) / 2,
    (sourceHeight - cropHeight) / 2,
    cropWidth,
    cropHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return toBase64Jpeg(canvas);
}

/** Reads an image file and returns it as base64 JPEG, cropped to `aspect` when given, otherwise only scaled down. */
export async function fileToBase64(file: File, aspect?: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("El archivo no es una imagen válida."));
      el.src = url;
    });
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    return cropToBase64(img, width, height, aspect ?? width / height);
  } finally {
    URL.revokeObjectURL(url);
  }
}
