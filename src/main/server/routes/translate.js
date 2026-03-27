import { Router } from 'express'
import { streamExplain } from '../claude.js'

export function createTranslateRouter() {
  const router = Router()

  router.post('/', async (req, res) => {
    const { text } = req.body

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    try {
      await streamExplain(
        [{ role: 'user', content: `请将以下内容翻译成中文，保持学术准确性：\n\n${text}` }],
        (chunk) => res.write(`data: ${JSON.stringify({ chunk })}\n\n`),
        () => { res.write('data: [DONE]\n\n'); res.end() }
      )
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    }
  })

  return router
}
