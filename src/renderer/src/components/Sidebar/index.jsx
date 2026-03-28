import { useRef, useEffect } from 'react'
import { useStore } from '../../store/useStore.js'
import { ExplainCard } from './ExplainCard.jsx'

export function Sidebar({ pdfViewerRef }) {
  const cards = useStore((s) => s.cards)
  const pdfHash = useStore((s) => s.pdfHash)
  const clickedRectId = useStore((s) => s.clickedRectId)
  const setClickedRectId = useStore((s) => s.setClickedRectId)
  const scrollRef = useRef(null)
  const cardRefs = useRef({})

  // Sort: by page asc, then createdAt asc; temp (generating) cards always at bottom
  const currentCards = pdfHash
    ? [...cards.filter((c) => c.pdfHash === pdfHash)].sort((a, b) => {
        const aTemp = String(a.id).startsWith('temp-')
        const bTemp = String(b.id).startsWith('temp-')
        if (aTemp && !bTemp) return 1
        if (!aTemp && bTemp) return -1
        if (a.pageNum !== b.pageNum) return a.pageNum - b.pageNum
        return (a.createdAt || 0) - (b.createdAt || 0)
      })
    : []

  // Auto-scroll to bottom when a new card is added
  const prevCountRef = useRef(0)
  useEffect(() => {
    if (currentCards.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
    prevCountRef.current = currentCards.length
  }, [currentCards.length])

  // Scroll sidebar to card when its PDF highlight is clicked
  useEffect(() => {
    if (!clickedRectId) return
    const el = cardRefs.current[clickedRectId]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setClickedRectId(null)
  }, [clickedRectId, setClickedRectId])

  const handleScrollToPDF = (card) => {
    pdfViewerRef?.current?.scrollToCard(card)
  }

  return (
    <div className="w-1/2 flex-shrink-0 bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3">
        {currentCards.length === 0 ? (
          <div className="text-center mt-12 text-gray-400 text-xs leading-relaxed">
            <div className="text-2xl mb-2">📖</div>
            选中 PDF 文字或区域后
            <br />
            点击「讲解」按钮生成解析
          </div>
        ) : (
          currentCards.map((card) => (
            <div
              key={card.id}
              ref={(el) => {
                if (el) cardRefs.current[card.id] = el
              }}
            >
              <ExplainCard card={card} onScrollToPDF={handleScrollToPDF} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
