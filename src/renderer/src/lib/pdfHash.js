export async function hashFile(arrayBuffer) {
  const subtle = globalThis.crypto?.subtle ?? (await import('node:crypto')).webcrypto.subtle
  const hashBuffer = await subtle.digest('SHA-256', arrayBuffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
