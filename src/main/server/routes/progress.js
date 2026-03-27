import { Router } from 'express'
import { getProgress, saveProgress } from '../../db/progress.js'

export function createProgressRouter(db) {
  const router = Router()

  router.get('/', (req, res) => {
    const { pdfHash } = req.query
    res.json(getProgress(db, pdfHash))
  })

  router.put('/', async (req, res) => {
    const { pdfHash, page, scrollY } = req.body
    await saveProgress(db, pdfHash, page, scrollY)
    res.json({ ok: true })
  })

  return router
}
