import { Router } from 'express'
import { callClaude } from '../claude.js'

export function createExplainRouter() {
  const router = Router()

  router.post('/', async (req, res) => {
    const { text } = req.body
    if (!text) return res.status(400).json({ error: '缺少 text 参数' })

    const content = await callClaude(`请用中文讲解以下内容，语言简洁易懂：\n\n${text}`)
    res.json({ content })
  })

  return router
}
