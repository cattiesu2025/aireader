import { execFile } from 'child_process'
import { promisify } from 'util'
import { homedir } from 'os'

const execFileAsync = promisify(execFile)

const SYSTEM_PROMPT = `你是一位专业的学习辅导助手。请始终用中文回答，语言简洁清晰，适合学习理解。`

// Electron's PATH is stripped — augment it with common install locations
const extraPaths = [
  `${homedir()}/.local/bin`,
  `${homedir()}/.npm-global/bin`,
  `${homedir()}/.nvm/current/bin`,
  '/usr/local/bin',
  '/opt/homebrew/bin',
].join(':')
const env = { ...process.env, PATH: `${extraPaths}:${process.env.PATH || ''}` }

export async function callClaude(prompt, signal) {
  const fullPrompt = `${SYSTEM_PROMPT}\n\n${prompt}`
  try {
    const { stdout, stderr } = await execFileAsync(
      'claude',
      ['--print', fullPrompt],
      { timeout: 120000, signal, env }
    )
    if (stderr) console.warn('[claude stderr]', stderr.trim())
    return stdout.trim()
  } catch (err) {
    console.error('[claude error]', err.message)
    throw new Error(`AI 调用失败：${err.message}`)
  }
}
