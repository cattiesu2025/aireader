import { useState, useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore.js'
import { captureRegion } from '../lib/captureRegion.js'

export function usePDFSelection(pdfContainerRef, currentPage, scale) {
  const [mode, setMode] = useState('text')       // 'text' | 'region'
  const [drawing, setDrawing] = useState(false)
  const [startPos, setStartPos] = useState(null)
  const [currentRect, setCurrentRect] = useState(null)
  const setSelection = useStore((s) => s.setSelection)

  // --- TEXT SELECTION MODE ---
  // Listen for native mouseup on the document and read window.getSelection()
  useEffect(() => {
    if (mode !== 'text') return

    const handleMouseUp = () => {
      const sel = window.getSelection()
      const text = sel?.toString().trim()
      if (!text) return

      let range
      try {
        range = sel.getRangeAt(0)
      } catch {
        return
      }

      const containerEl = pdfContainerRef.current
      if (!containerEl) return
      if (!containerEl.contains(range.commonAncestorContainer)) return

      const containerRect = containerEl.getBoundingClientRect()
      const domRect = range.getBoundingClientRect()

      setSelection({
        type: 'text',
        text,
        imageBase64: null,
        pageNum: currentPage,
        rect: {
          x: domRect.left - containerRect.left,
          y: domRect.top - containerRect.top,
          width: domRect.width,
          height: domRect.height,
        },
      })
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [mode, currentPage, pdfContainerRef, setSelection])

  // --- REGION SELECTION MODE ---
  const onRegionMouseDown = useCallback((e) => {
    if (mode !== 'region') return
    e.preventDefault()
    const containerEl = pdfContainerRef.current
    if (!containerEl) return
    const rect = containerEl.getBoundingClientRect()
    setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setDrawing(true)
    setCurrentRect(null)
  }, [mode, pdfContainerRef])

  const onRegionMouseMove = useCallback((e) => {
    if (!drawing || !startPos) return
    const containerEl = pdfContainerRef.current
    if (!containerEl) return
    const rect = containerEl.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setCurrentRect({
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y),
    })
  }, [drawing, startPos, pdfContainerRef])

  const onRegionMouseUp = useCallback(async (e) => {
    if (!drawing) return
    setDrawing(false)

    const rect = currentRect
    if (!rect || rect.width < 10 || rect.height < 10) {
      setCurrentRect(null)
      return
    }

    const containerEl = pdfContainerRef.current
    // Find the pdf.js canvas inside the container
    const canvas = containerEl?.querySelector('canvas')
    if (!canvas) {
      setCurrentRect(null)
      return
    }

    try {
      const deviceScale = canvas.width / canvas.clientWidth
      const imageBase64 = await captureRegion(canvas, rect, deviceScale)
      const imagePath = await window.electron.saveTempImage(imageBase64)
      setSelection({
        type: 'region',
        text: '[图片区域]',
        imagePath,
        pageNum: currentPage,
        rect,
      })
    } catch (err) {
      console.warn('[usePDFSelection] captureRegion failed:', err.message)
    } finally {
      setCurrentRect(null)
    }
  }, [drawing, currentRect, pdfContainerRef, currentPage, setSelection])

  return {
    mode,
    setMode,
    currentRect,
    drawing,
    regionHandlers: {
      onMouseDown: onRegionMouseDown,
      onMouseMove: onRegionMouseMove,
      onMouseUp: onRegionMouseUp,
    },
  }
}
