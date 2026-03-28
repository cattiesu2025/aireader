import { useHoverSync } from '../../hooks/useHoverSync.js'
import { useStore } from '../../store/useStore.js'

export function SelectionOverlay({ cards, pageNum, scale }) {
  const pageCards = cards.filter((c) => c.pageNum === pageNum)
  if (pageCards.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {pageCards.map((card) => (
        <CardRect key={card.id} card={card} scale={scale} />
      ))}
    </div>
  )
}

function CardRect({ card, scale }) {
  const { pdfHandlers, isHighlightedFromSidebar } = useHoverSync(card.id)
  const setClickedRectId = useStore((s) => s.setClickedRectId)
  const { rect } = card

  // Scale stored coords to current zoom level
  const ratio = scale / (rect.captureScale || scale)
  const display = {
    left:   rect.x      * ratio,
    top:    rect.y      * ratio,
    width:  rect.width  * ratio,
    height: rect.height * ratio,
  }

  return (
    <div
      {...pdfHandlers}
      onClick={() => setClickedRectId(card.id)}
      className={`absolute pointer-events-auto cursor-pointer transition-all duration-200 ${
        isHighlightedFromSidebar
          ? 'bg-blue-300/50 ring-2 ring-blue-500 animate-pulse'
          : 'bg-yellow-200/40 ring-1 ring-yellow-400 hover:bg-yellow-300/50'
      }`}
      style={display}
    />
  )
}
