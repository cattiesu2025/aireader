import { useState, useCallback } from 'react'
import { useStore } from '../store/useStore.js'

const API = 'http://localhost:3799'

export function useTranslate() {
  const [translatingId, setTranslatingId] = useState(null)
  const { updateCard } = useStore()

  const translate = useCallback(async (cardId, text) => {
    if (translatingId) return
    setTranslatingId(cardId)
    updateCard(cardId, { translation: '' })

    let fullTranslation = ''
    try {
      const res = await fetch(`${API}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
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
          if (data === '[DONE]') break
          try {
            const { chunk, error } = JSON.parse(data)
            if (error) throw new Error(error)
            if (chunk) {
              fullTranslation += chunk
              updateCard(cardId, { translation: fullTranslation })
            }
          } catch (e) {
            if (e.message !== 'Unexpected end of JSON input') throw e
          }
        }
      }

      // Persist translation
      await fetch(`${API}/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ translation: fullTranslation }),
      })
    } catch (err) {
      updateCard(cardId, { translation: `[错误] ${err.message}` })
    } finally {
      setTranslatingId(null)
    }
  }, [translatingId, updateCard])

  return { translate, translating: translatingId !== null, translatingId }
}
