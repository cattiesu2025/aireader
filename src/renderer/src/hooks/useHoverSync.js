import { useStore } from '../store/useStore.js'

export function useHoverSync(cardId) {
  const hoveredCardId = useStore((s) => s.hoveredCardId)
  const hoveredRectId = useStore((s) => s.hoveredRectId)
  const setHoveredCardId = useStore((s) => s.setHoveredCardId)
  const setHoveredRectId = useStore((s) => s.setHoveredRectId)

  return {
    // Spread onto sidebar card element
    sidebarHandlers: {
      onMouseEnter: () => setHoveredCardId(cardId),
      onMouseLeave: () => setHoveredCardId(null),
    },
    // Spread onto PDF highlight rect element
    pdfHandlers: {
      onMouseEnter: () => setHoveredRectId(cardId),
      onMouseLeave: () => setHoveredRectId(null),
    },
    // Use these to apply CSS classes
    isHighlightedFromSidebar: hoveredCardId === cardId,
    isHighlightedFromPDF: hoveredRectId === cardId,
  }
}
