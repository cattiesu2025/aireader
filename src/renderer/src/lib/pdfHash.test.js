import { describe, it, expect } from 'vitest'
import { hashFile } from './pdfHash.js'

describe('hashFile', () => {
  it('returns a 64-char hex string for any ArrayBuffer', async () => {
    const buf = new TextEncoder().encode('hello world').buffer
    const hash = await hashFile(buf)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns the same hash for identical content', async () => {
    const buf = new TextEncoder().encode('same content').buffer
    const h1 = await hashFile(buf)
    const h2 = await hashFile(buf)
    expect(h1).toBe(h2)
  })

  it('returns different hashes for different content', async () => {
    const buf1 = new TextEncoder().encode('content A').buffer
    const buf2 = new TextEncoder().encode('content B').buffer
    const h1 = await hashFile(buf1)
    const h2 = await hashFile(buf2)
    expect(h1).not.toBe(h2)
  })
})
