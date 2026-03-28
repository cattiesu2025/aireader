import { Router } from 'express'
import { callClaude, callClaudeInteractive } from '../claude.js'

export function createExplainRouter() {
  const router = Router()

  router.post('/', async (req, res) => {
    const { text, imagePath } = req.body
    if (!text && !imagePath) return res.status(400).json({ error: '缺少参数' })

    let content
    if (imagePath) {
      content = await callClaudeInteractive(
        `${SYSTEM_PROMPT_IMG}\n\n请用中文讲解这张图片的内容，语言简洁易懂：${imagePath}`
      )
    } else {
      content = await callClaude(`请用中文讲解以下内容，语言简洁易懂：\n\n${text}`)
    }
    res.json({ content })
  })

  return router
}

const SYSTEM_PROMPT_IMG = `你是一位专业的学习辅导助手。请始终用中文回答，语言简洁清晰，适合学习理解。不要在回答末尾添加任何引导性提问、邀请继续提问或建议用户补充信息的语句，直接给出内容即可。`
