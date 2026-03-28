import { spawn } from 'child_process'
import { homedir } from 'os'

const SYSTEM_PROMPT = `你是一位专业的学习辅导助手。请始终用中文回答，语言简洁清晰，适合学习理解。`

const CLAUDE_BIN = `${homedir()}/.local/bin/claude`

// Electron's PATH is stripped — use absolute path + clean env
const env = {
  ...process.env,
  HOME: homedir(),
  PATH: [
    `${homedir()}/.local/bin`,
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/usr/bin',
    '/bin',
    process.env.PATH || '',
  ].join(':'),
}
delete env.CLAUDECODE
delete env.CLAUDE_CODE_SESSION_ACCESS_TOKEN

export function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const fullPrompt = `${SYSTEM_PROMPT}\n\n${prompt}`
    console.log('[claude] spawning:', CLAUDE_BIN)

    const proc = spawn(CLAUDE_BIN, ['--print', fullPrompt], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => (stdout += d.toString()))
    proc.stderr.on('data', (d) => (stderr += d.toString()))

    proc.on('close', (code) => {
      if (stderr) console.warn('[claude stderr]', stderr.trim())
      if (code !== 0) {
        reject(new Error(stderr.trim() || `exit code ${code}`))
      } else {
        resolve(stdout.trim())
      }
    })

    proc.on('error', (err) => {
      console.error('[claude spawn error]', err)
      reject(err)
    })
  })
}
