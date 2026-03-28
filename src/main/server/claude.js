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

// Interactive mode: spawns claude without --print, pipes prompt via stdin.
// Used for image references since --print doesn't support images.
export function callClaudeInteractive(prompt) {
  return new Promise((resolve, reject) => {
    console.log('[claude] interactive mode')
    const proc = spawn(CLAUDE_BIN, [], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    proc.stdin.write(prompt + '\n')
    proc.stdin.end()

    let out = '', err = ''
    proc.stdout.on('data', (d) => (out += d.toString()))
    proc.stderr.on('data', (d) => (err += d.toString()))

    proc.on('close', (code) => {
      if (err) console.warn('[claude-interactive stderr]', err.trim())
      if (code !== 0) {
        reject(new Error(err.trim() || `exit code ${code}`))
        return
      }
      // Strip ANSI escape sequences and control chars
      const clean = out
        .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
        .replace(/\x1B\][^\x07]*\x07/g, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .trim()
      resolve(clean)
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
