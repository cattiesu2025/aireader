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
  const scrollRef = useRef(null)
  const pageRefs = useRef({})          // { pageNum: HTMLElement }
  const pendingScrollPage = useRef(null)

  const {
    currentPage, totalPages, scale, cards, pdfHash, selection,
    setCurrentPage, setTotalPages, setPdfHash, setCards, setScale,
  } = useStore()

  const { mode, setMode, currentRect, drawing, drawingPage, makeRegionHandlers } =
    usePDFSelection(pageRefs, currentPage, scale)
  const { explain, streaming } = useExplain()

  const handleExplainPage = async () => {
    const canvas = pageRefs.current[currentPage]?.querySelector('canvas')
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
    pageRefs.current = {}
    ;(async () => {
      try {
        const hash = await window.electron.hashFile(filePath)
        setPdfHash(hash)
        const [savedCards, progress] = await Promise.all([
          fetch(`${API}/api/cards?pdfHash=${hash}`).then((r) => r.json()),
          fetch(`${API}/api/progress?pdfHash=${hash}`).then((r) => r.json()),
        ])
        setCards(savedCards)
        if (progress?.page && progress.page > 1) {
          setCurrentPage(progress.page)
          pendingScrollPage.current = progress.page
        }
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

  // Auto-fit scale from first page's natural width
  const handlePageLoadSuccess = (page) => {
    if (!scrollRef.current) return
    const naturalWidth = page.getViewport({ scale: 1.0 }).width
    const availableWidth = scrollRef.current.clientWidth - 32 // 2 × p-4
    setScale(availableWidth / naturalWidth)
  }

  // IntersectionObserver: track which page is most visible while scrolling.
  // Also scrolls to saved progress page after pages are first rendered.
  useEffect(() => {
    if (!totalPages || !scrollRef.current) return

    // Restore saved progress position
    if (pendingScrollPage.current) {
      const target = pendingScrollPage.current
      pendingScrollPage.current = null
      setTimeout(() => {
        pageRefs.current[target]?.scrollIntoView({ block: 'start' })
      }, 200)
    }

    const ratios = {}
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          ratios[parseInt(e.target.dataset.page)] = e.intersectionRatio
        })
        let maxPage = 1, maxRatio = -1
        Object.entries(ratios).forEach(([page, ratio]) => {
          if (ratio > maxRatio) { maxRatio = ratio; maxPage = parseInt(page) }
        })
        if (maxRatio > 0) setCurrentPage(maxPage)
      },
      { root: scrollRef.current, threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0] },
    )
    Object.values(pageRefs.current).forEach((el) => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [totalPages])

  const scrollToPage = (pageNum) => {
    pageRefs.current[pageNum]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Expose scrollToCard to parent via ref
  useImperativeHandle(ref, () => ({
    scrollToCard: (card) => {
      const pageEl = pageRefs.current[card.pageNum]
      const scrollContainer = scrollRef.current
      if (!pageEl || !scrollContainer) return
      const ratio = scale / (card.rect.captureScale || scale)
      const scrollTop = scrollContainer.scrollTop
      const containerRect = scrollContainer.getBoundingClientRect()
      const pageRect = pageEl.getBoundingClientRect()
      const targetScrollTop = scrollTop + (pageRect.top - containerRect.top) + card.rect.y * ratio - 80
      scrollContainer.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' })
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
      <div ref={scrollRef} className="flex-1 overflow-auto bg-gray-100 flex flex-col p-4 pb-16">
        <Document
          file={filePath ? `localfile://localhost${filePath}` : null}
          onLoadSuccess={({ numPages }) => setTotalPages(numPages)}
          loading={<div className="text-gray-400 text-sm p-4">加载中…</div>}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              data-page={pageNum}
              ref={(el) => { pageRefs.current[pageNum] = el }}
              className="relative mx-auto mb-4"
              style={{
                cursor: mode === 'region' ? 'crosshair' : 'text',
                userSelect: mode === 'region' ? 'none' : 'text',
              }}
              {...(mode === 'region' ? makeRegionHandlers(pageNum) : {})}
            >
              <Page
                pageNumber={pageNum}
                scale={scale}
                onLoadSuccess={pageNum === 1 ? handlePageLoadSuccess : undefined}
                renderTextLayer={mode === 'text'}
                renderAnnotationLayer={false}
              />
              <SelectionOverlay cards={cards} pageNum={pageNum} scale={scale} />
              {selection?.pageNum === pageNum && <ExplainButton />}

              {/* Region drag preview */}
              {drawing && drawingPage === pageNum && currentRect && (
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
          ))}
        </Document>
      </div>

      {/* Fixed bottom navigation bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-3 px-4 py-2 bg-white/90 backdrop-blur border-t border-gray-200 text-sm text-gray-600 select-none z-30">
        <button
          onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          ‹ 上一页
        </button>
        <span className="text-gray-500 tabular-nums">{currentPage} / {totalPages || '–'}</span>
        <button
          onClick={() => scrollToPage(Math.min(totalPages, currentPage + 1))}
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
