import { Router } from 'express'
import { getCards, saveCard, updateCard, deleteCard } from '../../db/cards.js'

export function createCardsRouter(db) {
  const router = Router()

  router.get('/', (req, res) => {
    const { pdfHash } = req.query
    res.json(getCards(db, pdfHash))
  })

  router.post('/', async (req, res) => {
    const card = await saveCard(db, req.body)
    res.json(card)
  })

  router.patch('/:id', async (req, res) => {
    const card = await updateCard(db, req.params.id, req.body)
    res.json(card)
  })

  router.delete('/:id', async (req, res) => {
    await deleteCard(db, req.params.id)
    res.json({ ok: true })
  })

  return router
}
