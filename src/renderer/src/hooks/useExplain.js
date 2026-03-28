import { useState, useCallback } from 'react'
import { useStore } from '../store/useStore.js'

const API = 'http://localhost:3799'

export function useExplain() {
  const [loading, setLoading] = useState(false)
  const { addCard, updateCard, pdfHash } = useStore()

  const explain = useCallback(async (selection) => {
    if (loading || !selection.text) return

    const tempId = `temp-${Date.now()}`
    addCard({
      id: tempId,
      pdfHash,
      pageNum: selection.pageNum,
      rect: selection.rect,
      sourceText: selection.text,
      content: '',
      translation: null,
      note: '',
      createdAt: Date.now(),
    })
    setLoading(true)

    try {
      const res = await fetch(`${API}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selection.imagePath ? null : selection.text,
          imagePath: selection.imagePath || null,
        }),
      })
      const { content, error } = await res.json()
      if (error) throw new Error(error)

      updateCard(tempId, { content })

      // Persist
      const saved = await fetch(`${API}/api/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfHash,
          pageNum: selection.pageNum,
          rect: selection.rect,
          sourceText: selection.text,
          content,
          translation: null,
          note: '',
        }),
      }).then((r) => r.json())

      updateCard(tempId, { id: saved.id })
    } catch (err) {
      updateCard(tempId, { content: `[错误] ${err.message}` })
    } finally {
      setLoading(false)
      if (selection.imagePath) window.electron.deleteTempImage(selection.imagePath)
    }
  }, [loading, pdfHash, addCard, updateCard])

  const translateSelection = useCallback(async (selection) => {
    if (loading || !selection.text) return

    const tempId = `temp-${Date.now()}`
    addCard({
      id: tempId,
      pdfHash,
      pageNum: selection.pageNum,
      rect: selection.rect,
      sourceText: selection.text,
      content: '',
      translation: null,
      note: '',
      createdAt: Date.now(),
    })
    setLoading(true)

    try {
      const res = await fetch(`${API}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selection.text }),
      })
      const { content, error } = await res.json()
      if (error) throw new Error(error)

      updateCard(tempId, { content })

      const saved = await fetch(`${API}/api/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfHash,
          pageNum: selection.pageNum,
          rect: selection.rect,
          sourceText: selection.text,
          content,
          translation: null,
          note: '',
        }),
      }).then((r) => r.json())

      updateCard(tempId, { id: saved.id })
    } catch (err) {
      updateCard(tempId, { content: `[错误] ${err.message}` })
    } finally {
      setLoading(false)
    }
  }, [loading, pdfHash, addCard, updateCard])

  return { explain, translateSelection, streaming: loading }
}
