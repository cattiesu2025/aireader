import { spawn } from 'child_process'
import { homedir } from 'os'

const SYSTEM_PROMPT = `你是一位专业的学习辅导助手。请始终用中文回答，语言简洁清晰，适合学习理解。不要在回答末尾添加任何引导性提问、邀请继续提问或建议用户补充信息的语句，直接给出内容即可。`

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

// Image mode: uses --print + --dangerously-skip-permissions so claude can
// read image files from disk without interactive permission prompts.
export function callClaudeInteractive(prompt) {
  return new Promise((resolve, reject) => {
    console.log('[claude] image mode')
    const proc = spawn(CLAUDE_BIN, ['--dangerously-skip-permissions', '--print', prompt], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let out = '', err = ''
    proc.stdout.on('data', (d) => (out += d.toString()))
    proc.stderr.on('data', (d) => (err += d.toString()))

    proc.on('close', (code) => {
      if (err) console.warn('[claude-image stderr]', err.trim())
      if (code !== 0) {
        console.error('[claude-image] stdout so far:', out.trim())
        reject(new Error(err.trim() || `exit code ${code}`))
      } else {
        resolve(out.trim())
      }
    })

    proc.on('error', reject)
  })
}

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
