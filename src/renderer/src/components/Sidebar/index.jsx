import { useStore } from '../../store/useStore.js'
import { ExplainCard } from './ExplainCard.jsx'

export function Sidebar({ pdfViewerRef }) {
  const cards = useStore((s) => s.cards)
  const pdfHash = useStore((s) => s.pdfHash)

  const currentCards = pdfHash
    ? cards.filter((c) => c.pdfHash === pdfHash)
    : []

  const handleScrollToPDF = (card) => {
    pdfViewerRef?.current?.scrollToCard(card)
  }

  return (
    <div className="w-80 flex-shrink-0 bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-700">AI 讲解</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {currentCards.length > 0 ? `${currentCards.length} 条记录` : '暂无讲解'}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {currentCards.length === 0 ? (
          <div className="text-center mt-12 text-gray-400 text-xs leading-relaxed">
            <div className="text-2xl mb-2">📖</div>
            选中 PDF 文字或区域后<br />点击「讲解」按钮生成解析
          </div>
        ) : (
          currentCards.map((card) => (
            <ExplainCard key={card.id} card={card} onScrollToPDF={handleScrollToPDF} />
          ))
        )}
      </div>
    </div>
  )
}
