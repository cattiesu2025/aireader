import { useStore } from '../../store/useStore.js'
import { useExplain } from '../../hooks/useExplain.js'

export function ExplainButton() {
  const selection = useStore((s) => s.selection)
  const clearSelection = useStore((s) => s.clearSelection)
  const { explain, translateSelection, streaming } = useExplain()

  if (!selection) return null

  const { rect } = selection
  const buttonTop = rect.y + rect.height + 6

  const handleExplain = async () => {
    const sel = selection
    clearSelection()
    await explain(sel)
  }

  const handleTranslate = async () => {
    const sel = selection
    clearSelection()
    await translateSelection(sel)
  }

  return (
    <div
      className="absolute z-20 flex gap-1 shadow-lg select-none"
      style={{ left: rect.x, top: buttonTop }}
      onMouseDown={(e) => {
        e.stopPropagation()
        window.getSelection()?.removeAllRanges()
      }}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <button
        onClick={handleExplain}
        disabled={streaming}
        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {streaming ? '生成中…' : '讲解'}
      </button>
      <button
        onClick={clearSelection}
        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200 border border-gray-300"
      >
        ✕
      </button>
    </div>
  )
}
