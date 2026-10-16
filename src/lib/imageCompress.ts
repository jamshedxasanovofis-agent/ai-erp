// Resizes to a sane max dimension and re-encodes as JPEG before upload — a
// 3-4MB phone photo has way more pixels/bitrate than anyone views it at, so
// this cuts it down to a couple hundred KB with no visible quality loss at
// normal viewing sizes, instead of storing (and re-downloading) the original.
export async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file

  const bitmap = await createImageBitmap(file)
  let { width, height } = bitmap
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality))
  if (!blob) return file
  // Tiny/simple images (screenshots, icons) sometimes compress larger as
  // re-encoded JPEG than the original — keep whichever is actually smaller.
  return blob.size < file.size ? blob : file
}
