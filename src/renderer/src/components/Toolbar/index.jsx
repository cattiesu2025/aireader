import { useStore } from '../../store/useStore.js'

export function Toolbar({ onOpenFile, selectionMode, onModeChange }) {
  const { scale, setScale, currentPage, totalPages } = useStore()

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0 select-none">
      {/* Open file */}
      <button
        onClick={onOpenFile}
        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
      >
        打开 PDF
      </button>

      <div className="h-4 w-px bg-gray-200" />

      {/* Selection mode toggle */}
      <div className="flex rounded border border-gray-200 overflow-hidden text-xs">
        <button
          onClick={() => onModeChange('text')}
          title="文字选区模式"
          className={`px-2.5 py-1 transition-colors ${
            selectionMode === 'text'
              ? 'bg-blue-50 text-blue-600 font-medium'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          T 文字
        </button>
        <button
          onClick={() => onModeChange('region')}
          title="框选图片模式 (Shift 拖拽)"
          className={`px-2.5 py-1 border-l border-gray-200 transition-colors ${
            selectionMode === 'region'
              ? 'bg-blue-50 text-blue-600 font-medium'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          ⬚ 区域
        </button>
      </div>

      <div className="h-4 w-px bg-gray-200" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setScale(Math.max(0.5, +(scale - 0.1).toFixed(1)))}
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded text-base leading-none"
        >
          −
        </button>
        <span className="text-xs text-gray-500 w-10 text-center tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(Math.min(3, +(scale + 0.1).toFixed(1)))}
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded text-base leading-none"
        >
          +
        </button>
      </div>

      {/* Page info (right-aligned) */}
      {totalPages > 0 && (
        <>
          <div className="h-4 w-px bg-gray-200" />
          <span className="text-xs text-gray-400 tabular-nums ml-auto">
            第 {currentPage} / {totalPages} 页
          </span>
        </>
      )}
    </div>
  )
}
