import { Router } from 'express'
import { streamExplain } from '../claude.js'

export function createExplainRouter() {
  const router = Router()

  router.post('/', async (req, res) => {
    const { text, imageBase64 } = req.body
    const abortController = new AbortController()

    req.on('close', () => abortController.abort())

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const content = imageBase64
      ? [
          { type: 'image_url', image_url: { url: imageBase64 } },
          { type: 'text', text: '请分析这张图表并用中文详细讲解其内容和含义。' },
        ]
      : `请用中文讲解以下内容，语言简洁易懂：\n\n${text}`

    try {
      await streamExplain(
        [{ role: 'user', content }],
        (chunk) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify({ chunk })}\n\n`) },
        () => { if (!res.writableEnded) { res.write('data: [DONE]\n\n'); res.end() } },
        abortController.signal
      )
    } catch (err) {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
        res.end()
      }
    }
  })

  return router
}
