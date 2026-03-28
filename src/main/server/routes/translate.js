import { Router } from 'express'
import { callClaude } from '../claude.js'

export function createTranslateRouter() {
  const router = Router()

  router.post('/', async (req, res) => {
    const { text } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 参数' })

    const content = await callClaude(`请将以下内容翻译成中文，保持学术准确性：\n\n${text}`)
    res.json({ content })
  })

  return router
}
