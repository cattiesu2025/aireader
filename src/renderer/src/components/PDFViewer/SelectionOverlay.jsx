import { useHoverSync } from '../../hooks/useHoverSync.js'

export function SelectionOverlay({ cards, pageNum }) {
  const pageCards = cards.filter((c) => c.pageNum === pageNum)
  if (pageCards.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {pageCards.map((card) => (
        <CardRect key={card.id} card={card} />
      ))}
    </div>
  )
}

function CardRect({ card }) {
  const { pdfHandlers, isHighlightedFromSidebar } = useHoverSync(card.id)
  const { rect } = card

  return (
    <div
      {...pdfHandlers}
      className={`absolute pointer-events-auto cursor-pointer transition-all duration-200 ${
        isHighlightedFromSidebar
          ? 'bg-blue-300/50 ring-2 ring-blue-500 animate-pulse'
          : 'bg-yellow-200/40 ring-1 ring-yellow-400 hover:bg-yellow-300/50'
      }`}
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
    />
  )
}
