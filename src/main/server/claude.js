const ROUTER_BASE = 'http://localhost:3000'

export const SYSTEM_PROMPT = `你是一位专业的学习辅导助手。
请始终用中文回答，语言简洁清晰，适合学习理解。`

export async function streamExplain(messages, onChunk, onDone, signal) {
  const response = await fetch(`${ROUTER_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer dummy' },
    signal,
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      stream: true,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
  })

  if (!response.ok) throw new Error(`Router error: ${response.status}`)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') { onDone(); return }
      try {
        const json = JSON.parse(data)
        const chunk = json.choices?.[0]?.delta?.content
        if (chunk) onChunk(chunk)
      } catch {}
    }
  }
  onDone()
}
