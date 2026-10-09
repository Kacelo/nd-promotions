/**
 * Browser-only: shrinks an image before upload so pages stay fast and storage
 * egress stays low. Resizes to fit MAX_DIMENSION and re-encodes as WebP
 * (JPEG where the browser can't encode WebP). A 5 MB phone photo usually
 * comes out at 200–500 KB.
 */
const MAX_DIMENSION = 2000;
const QUALITY = 0.82;

/** Originals up to this size are accepted, since they shrink before upload. */
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

export async function compressImage(file: File): Promise<File> {
  // imageOrientation honours the EXIF rotation phones write into photos
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let blob = await encode(canvas, 'image/webp');
  // Browsers that can't encode WebP silently return PNG — fall back to JPEG on a cream
  // background (JPEG has no transparency).
  if (!blob || blob.type !== 'image/webp') {
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#fbf6f1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    blob = await encode(canvas, 'image/jpeg');
  }
  if (!blob) throw new Error(`Could not process “${file.name}”.`);

  // Already-small originals can come out larger; keep whichever is smaller.
  if (blob.size >= file.size && scale === 1) return file;

  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
  return new File([blob], name, { type: blob.type });
}
