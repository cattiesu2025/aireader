import { useState, useCallback } from 'react'
import { useStore } from '../store/useStore.js'

const API = 'http://localhost:3799'

export function useExplain() {
  const [streaming, setStreaming] = useState(false)
  const { addCard, updateCard, pdfHash } = useStore()

  const explain = useCallback(async (selection) => {
    if (streaming) return

    const tempId = `temp-${Date.now()}`
    const tempCard = {
      id: tempId,
      pdfHash,
      pageNum: selection.pageNum,
      rect: selection.rect,
      sourceText: selection.text || '[图片区域]',
      content: '',
      translation: null,
      note: '',
      createdAt: Date.now(),
    }
    addCard(tempCard)
    setStreaming(true)

    let fullContent = ''

    try {
      const res = await fetch(`${API}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selection.text,
          imageBase64: selection.imageBase64,
          pdfHash,
          pageNum: selection.pageNum,
          rect: selection.rect,
        }),
      })

      const reader = res.body.getReader()
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
          if (data === '[DONE]') return
          try {
            const { chunk, error } = JSON.parse(data)
            if (error) throw new Error(error)
            if (chunk) {
              fullContent += chunk
              updateCard(tempId, { content: fullContent })
            }
          } catch (e) {
            if (e.message !== 'Unexpected end of JSON input') throw e
          }
        }
      }

      // Persist to backend
      const saved = await fetch(`${API}/api/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfHash,
          pageNum: selection.pageNum,
          rect: selection.rect,
          sourceText: selection.text || '[图片区域]',
          content: fullContent,
          translation: null,
          note: '',
        }),
      }).then((r) => r.json())

      // Swap temp ID for real persisted ID
      updateCard(tempId, { id: saved.id })
    } catch (err) {
      updateCard(tempId, { content: `[错误] ${err.message}` })
    } finally {
      setStreaming(false)
    }
  }, [streaming, pdfHash, addCard, updateCard])

  return { explain, streaming }
}
