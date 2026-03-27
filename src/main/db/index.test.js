// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { initDB } from './index.js'

const TEST_DATA_DIR = path.join(process.cwd(), 'data-test')

describe('LowDB init', () => {
  afterEach(() => {
    if (fs.existsSync(TEST_DATA_DIR)) fs.rmSync(TEST_DATA_DIR, { recursive: true })
  })

  it('creates data directory and returns db instances', async () => {
    const { cardsDB, progressDB } = await initDB(TEST_DATA_DIR)
    expect(cardsDB).toBeDefined()
    expect(progressDB).toBeDefined()
    expect(fs.existsSync(path.join(TEST_DATA_DIR, 'cards.json'))).toBe(true)
    expect(fs.existsSync(path.join(TEST_DATA_DIR, 'progress.json'))).toBe(true)
  })

  it('initializes with empty arrays', async () => {
    const { cardsDB, progressDB } = await initDB(TEST_DATA_DIR)
    expect(cardsDB.data.cards).toEqual([])
    expect(progressDB.data.progress).toEqual([])
  })
})
