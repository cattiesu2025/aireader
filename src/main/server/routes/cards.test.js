// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createCardsRouter } from './cards.js'

const mockDB = {
  data: { cards: [] },
  write: async () => {}
}

describe('GET /api/cards', () => {
  let app
  beforeAll(() => {
    app = express()
    app.use(express.json())
    app.use('/api/cards', createCardsRouter(mockDB))
  })

  it('returns empty array for unknown pdfHash', async () => {
    const res = await request(app).get('/api/cards?pdfHash=abc123')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('POST /api/cards creates a card and returns it with an id', async () => {
    const res = await request(app)
      .post('/api/cards')
      .send({ pdfHash: 'abc123', pageNum: 1, sourceText: 'hello', content: '', rect: {x:0,y:0,width:10,height:10}, note: '', translation: null })
    expect(res.status).toBe(200)
    expect(res.body.id).toBeDefined()
    expect(res.body.pdfHash).toBe('abc123')
  })
})
