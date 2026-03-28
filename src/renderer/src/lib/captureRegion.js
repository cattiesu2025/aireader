/**
 * Captures a rectangular region from a pdf.js canvas element.
 * @param {HTMLCanvasElement} pdfCanvas
 * @param {{ x: number, y: number, width: number, height: number }} rect - CSS pixels relative to canvas top-left
 * @param {number} deviceScale - canvas pixel density (devicePixelRatio * zoom)
 * @returns {Promise<string>} base64 data URL (image/png)
 */
export async function captureRegion(pdfCanvas, rect, deviceScale) {
  if (!deviceScale || deviceScale <= 0) {
    throw new Error('deviceScale must be a positive number')
  }
  const sx = Math.round(rect.x * deviceScale)
  const sy = Math.round(rect.y * deviceScale)
  const sw = Math.round(rect.width * deviceScale)
  const sh = Math.round(rect.height * deviceScale)

  const clampedSw = Math.min(sw, pdfCanvas.width - sx)
  const clampedSh = Math.min(sh, pdfCanvas.height - sy)

  if (clampedSw <= 0 || clampedSh <= 0) {
    throw new Error('Selected region is outside canvas bounds')
  }

  const offscreen = new OffscreenCanvas(clampedSw, clampedSh)
  const ctx = offscreen.getContext('2d')
  ctx.drawImage(pdfCanvas, sx, sy, clampedSw, clampedSh, 0, 0, clampedSw, clampedSh)

  const blob = await offscreen.convertToBlob({ type: 'image/png' })
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('FileReader failed'))
    reader.readAsDataURL(blob)
  })
}
