import { webcrypto } from 'node:crypto'

const subtleCrypto = globalThis.crypto?.subtle ?? webcrypto.subtle

export async function hashFile(arrayBuffer) {
  const hashBuffer = await subtleCrypto.digest('SHA-256', arrayBuffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
