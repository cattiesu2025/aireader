import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useStore } from '../../store/useStore.js'
import { usePDFSelection } from '../../hooks/usePDFSelection.js'
import { useExplain } from '../../hooks/useExplain.js'
import { SelectionOverlay } from './SelectionOverlay.jsx'
import { ExplainButton } from './ExplainButton.jsx'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const API = 'http://localhost:3799'

export const PDFViewer = forwardRef(function PDFViewer({ filePath, selectionMode }, ref) {
  const containerRef = useRef(null)
  const scrollRef = useRef(null)
  const {
    currentPage, totalPages, scale, cards, pdfHash,
    setCurrentPage, setTotalPages, setPdfHash, setCards,
  } = useStore()

  const { mode, setMode, currentRect, drawing, regionHandlers } =
    usePDFSelection(containerRef, currentPage, scale)
  const { explain, streaming } = useExplain()

  const handleExplainPage = async () => {
    const canvas = containerRef.current?.querySelector('canvas')
    if (!canvas) return
    const base64 = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '')
    const imagePath = await window.electron.saveTempImage(base64)
    await explain({ type: 'region', text: '[整页讲解]', imagePath, pageNum: currentPage, rect: { x: 0, y: 0, width: 0, height: 0 } })
  }

  // Sync external mode prop into hook state
  useEffect(() => {
    setMode(selectionMode || 'text')
  }, [selectionMode, setMode])

  // When a new PDF is opened: hash it, load saved cards + progress
  useEffect(() => {
    if (!filePath) return
    ;(async () => {
      try {
        const hash = await window.electron.hashFile(filePath)
        setPdfHash(hash)

        const [savedCards, progress] = await Promise.all([
          fetch(`${API}/api/cards?pdfHash=${hash}`).then((r) => r.json()),
          fetch(`${API}/api/progress?pdfHash=${hash}`).then((r) => r.json()),
        ])
        setCards(savedCards)
        if (progress?.page) setCurrentPage(progress.page)
      } catch (err) {
        console.error('[PDFViewer] load error:', err)
      }
    })()
  }, [filePath])

  // Save reading progress whenever page changes
  useEffect(() => {
    if (!pdfHash || !currentPage) return
    fetch(`${API}/api/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfHash, page: currentPage, scrollY: 0 }),
    }).catch(() => {})
  }, [currentPage, pdfHash])

  // Expose scrollToCard to parent via ref
  useImperativeHandle(ref, () => ({
    scrollToCard: (card) => {
      setCurrentPage(card.pageNum)
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ top: Math.max(0, card.rect.y - 80), behavior: 'smooth' })
        }
      }, 150)
    },
  }))

  if (!filePath) {
    return (
      <div className="w-1/2 flex items-center justify-center text-gray-400 text-sm select-none">
        请从工具栏打开 PDF 文件
      </div>
    )
  }

  return (
    <div className="w-1/2 relative flex flex-col overflow-hidden">
      {/* Scrollable PDF area */}
      <div ref={scrollRef} className="flex-1 overflow-auto bg-gray-100 flex flex-col items-center p-4 pb-16">
        <div
          ref={containerRef}
          className="relative"
          style={{ cursor: mode === 'region' ? 'crosshair' : 'text', userSelect: mode === 'region' ? 'none' : 'text' }}
          {...(mode === 'region' ? regionHandlers : {})}
        >
          <Document
            file={filePath ? `localfile://localhost${filePath}` : null}
            onLoadSuccess={({ numPages }) => setTotalPages(numPages)}
            loading={<div className="text-gray-400 text-sm p-4">加载中…</div>}
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={mode === 'text'}
              renderAnnotationLayer={false}
            />
          </Document>

          <SelectionOverlay cards={cards} pageNum={currentPage} scale={scale} />
          <ExplainButton />

          {/* Region drag preview */}
          {drawing && currentRect && (
            <div
              className="absolute border-2 border-blue-500 border-dashed bg-blue-50/20 pointer-events-none"
              style={{
                zIndex: 20,
                left: currentRect.x,
                top: currentRect.y,
                width: currentRect.width,
                height: currentRect.height,
              }}
            />
          )}
        </div>
      </div>

      {/* Fixed bottom navigation bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-3 px-4 py-2 bg-white/90 backdrop-blur border-t border-gray-200 text-sm text-gray-600 select-none z-30">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          ‹ 上一页
        </button>
        <span className="text-gray-500 tabular-nums">{currentPage} / {totalPages || '–'}</span>
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          下一页 ›
        </button>
        <button
          onClick={handleExplainPage}
          disabled={streaming}
          className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {streaming ? '生成中…' : '讲解本页'}
        </button>
      </div>
    </div>
  )
})
