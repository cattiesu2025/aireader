import express from 'express'
import cors from 'cors'
import { createCardsRouter } from './routes/cards.js'
import { createProgressRouter } from './routes/progress.js'
import { createExplainRouter } from './routes/explain.js'
import { createTranslateRouter } from './routes/translate.js'

const PORT = 3799

export function startServer(cardsDB, progressDB) {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '20mb' }))

  app.use('/api/cards', createCardsRouter(cardsDB))
  app.use('/api/progress', createProgressRouter(progressDB))
  app.use('/api/explain', createExplainRouter())
  app.use('/api/translate', createTranslateRouter())

  app.use((err, req, res, next) => {
    console.error('[server error]', err.message)
    res.status(500).json({ error: err.message })
  })

  const server = app.listen(PORT, () => {
    console.log(`[server] listening on :${PORT}`)
  })

  return server
}
