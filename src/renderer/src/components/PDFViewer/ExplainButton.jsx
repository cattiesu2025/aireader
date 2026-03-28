import { useStore } from '../../store/useStore.js'
import { useExplain } from '../../hooks/useExplain.js'

export function ExplainButton() {
  const selection = useStore((s) => s.selection)
  const clearSelection = useStore((s) => s.clearSelection)
  const { explain, streaming } = useExplain()

  if (!selection) return null

  const { rect } = selection
  const buttonTop = rect.y + rect.height + 6

  const handleExplain = async () => {
    await explain(selection)
    clearSelection()
  }

  return (
    <div
      className="absolute z-20 flex gap-1 shadow-lg"
      style={{ left: rect.x, top: buttonTop }}
    >
      <button
        onClick={handleExplain}
        disabled={streaming}
        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {streaming ? '讲解中…' : '讲解'}
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
