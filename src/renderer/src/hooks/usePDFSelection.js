import { useState, useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore.js'
import { captureRegion } from '../lib/captureRegion.js'

export function usePDFSelection(pageRefsRef, currentPage, scale) {
  const [mode, setMode] = useState('text')
  const [drawing, setDrawing] = useState(false)
  const [drawingPage, setDrawingPage] = useState(null)
  const [currentRect, setCurrentRect] = useState(null)
  const setSelection = useStore((s) => s.setSelection)

  // Refs for mutable drag state — avoids stale closures in event handlers
  const drawingRef = useRef(false)
  const drawingPageRef = useRef(null)
  const startPosRef = useRef(null)
  const currentRectRef = useRef(null)

  // --- TEXT SELECTION ---
  useEffect(() => {
    if (mode !== 'text') return

    const handleMouseUp = () => {
      const sel = window.getSelection()
      const text = sel?.toString().trim()
      if (!text) return

      let range
      try { range = sel.getRangeAt(0) } catch { return }

      // Walk up from the selection anchor to find which page it's in
      let node = range.commonAncestorContainer
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
      let pageNum = null
      let el = node
      while (el && el !== document.body) {
        if (el.dataset?.page) { pageNum = parseInt(el.dataset.page); break }
        el = el.parentElement
      }
      if (!pageNum) return

      const containerEl = pageRefsRef.current?.[pageNum]
      if (!containerEl) return

      const containerRect = containerEl.getBoundingClientRect()
      const domRect = range.getBoundingClientRect()

      setSelection({
        type: 'text',
        text,
        imageBase64: null,
        pageNum,
        rect: {
          x: domRect.left - containerRect.left,
          y: domRect.top - containerRect.top,
          width: domRect.width,
          height: domRect.height,
          captureScale: scale,
        },
      })
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [mode, scale, pageRefsRef, setSelection])

  // --- REGION SELECTION ---
  // Returns mouse event handlers for a specific page container.
  // Uses refs for mutable drag state so handlers don't go stale mid-drag.
  const makeRegionHandlers = useCallback((pageNum) => {
    const onMouseDown = (e) => {
      if (mode !== 'region') return
      e.preventDefault()
      const containerEl = pageRefsRef.current?.[pageNum]
      if (!containerEl) return
      const rect = containerEl.getBoundingClientRect()
      startPosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      drawingRef.current = true
      drawingPageRef.current = pageNum
      currentRectRef.current = null
      setDrawing(true)
      setDrawingPage(pageNum)
      setCurrentRect(null)
    }

    const onMouseMove = (e) => {
      if (!drawingRef.current || drawingPageRef.current !== pageNum) return
      const containerEl = pageRefsRef.current?.[pageNum]
      if (!containerEl) return
      const rect = containerEl.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const newRect = {
        x: Math.min(startPosRef.current.x, x),
        y: Math.min(startPosRef.current.y, y),
        width: Math.abs(x - startPosRef.current.x),
        height: Math.abs(y - startPosRef.current.y),
      }
      currentRectRef.current = newRect
      setCurrentRect(newRect)
    }

    const onMouseUp = async () => {
      if (!drawingRef.current || drawingPageRef.current !== pageNum) return
      drawingRef.current = false
      drawingPageRef.current = null
      setDrawing(false)
      setDrawingPage(null)

      const rect = currentRectRef.current
      if (!rect || rect.width < 10 || rect.height < 10) {
        setCurrentRect(null)
        return
      }

      const containerEl = pageRefsRef.current?.[pageNum]
      const canvas = containerEl?.querySelector('canvas')
      if (!canvas) { setCurrentRect(null); return }

      try {
        const deviceScale = canvas.width / canvas.clientWidth
        const dataUrl = await captureRegion(canvas, rect, deviceScale)
        const imageBase64 = dataUrl.replace(/^data:image\/png;base64,/, '')
        const imagePath = await window.electron.saveTempImage(imageBase64)
        setSelection({
          type: 'region',
          text: '[图片区域]',
          imagePath,
          pageNum,
          rect: { ...rect, captureScale: scale },
        })
      } catch (err) {
        console.warn('[usePDFSelection] captureRegion failed:', err.message)
      } finally {
        setCurrentRect(null)
      }
    }

    return { onMouseDown, onMouseMove, onMouseUp }
  }, [mode, scale, pageRefsRef, setSelection])

  return {
    mode,
    setMode,
    currentRect,
    drawing,
    drawingPage,
    makeRegionHandlers,
  }
}
