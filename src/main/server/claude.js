import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const SYSTEM_PROMPT = `你是一位专业的学习辅导助手。请始终用中文回答，语言简洁清晰，适合学习理解。`

export async function callClaude(prompt, signal) {
  const fullPrompt = `${SYSTEM_PROMPT}\n\n${prompt}`
  const { stdout } = await execFileAsync(
    'claude',
    ['--print', fullPrompt],
    { timeout: 120000, signal }
  )
  return stdout.trim()
}
