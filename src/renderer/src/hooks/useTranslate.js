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

    try {
      const res = await fetch(`${API}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const { content, error } = await res.json()
      if (error) throw new Error(error)

      updateCard(cardId, { translation: content })

      await fetch(`${API}/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ translation: content }),
      })
    } catch (err) {
      updateCard(cardId, { translation: `[错误] ${err.message}` })
    } finally {
      setTranslatingId(null)
    }
  }, [translatingId, updateCard])

  return { translate, translating: translatingId !== null, translatingId }
}
