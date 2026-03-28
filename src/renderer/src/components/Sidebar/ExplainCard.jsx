import { useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useHoverSync } from '../../hooks/useHoverSync.js'
import { useTranslate } from '../../hooks/useTranslate.js'
import { useStore } from '../../store/useStore.js'

const API = 'http://localhost:3799'

export function ExplainCard({ card, onScrollToPDF }) {
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState(card.note || '')
  const { sidebarHandlers, isHighlightedFromPDF } = useHoverSync(card.id)
  const { translate, translatingId } = useTranslate()
  const updateCard = useStore((s) => s.updateCard)

  const isTranslatingThis = translatingId === card.id

  const handleSaveNote = async () => {
    updateCard(card.id, { note: noteText })
    try {
      await fetch(`${API}/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText }),
      })
    } catch {}
    setEditingNote(false)
  }

  return (
    <div
      {...sidebarHandlers}
      onClick={() => onScrollToPDF?.(card)}
      className={`mb-3 p-3 bg-white rounded-lg border cursor-pointer transition-all duration-200 ${
        isHighlightedFromPDF
          ? 'animate-shake ring-2 ring-blue-400 border-blue-300 shadow-md'
          : 'border-gray-200 shadow-sm hover:border-blue-200 hover:shadow-md'
      }`}
    >
      {/* Source excerpt + page number */}
      <p className="text-xs text-gray-400 mb-1.5 truncate">
        第 {card.pageNum} 页 · {card.sourceText}
      </p>

      {/* AI explanation content */}
      <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none
        prose-headings:font-semibold prose-headings:text-gray-800 prose-headings:mt-2 prose-headings:mb-1
        prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0
        prose-table:text-xs prose-th:bg-gray-50 prose-td:border prose-th:border
        prose-strong:text-gray-800 prose-code:text-xs prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded">
        {card.content
          ? <Markdown remarkPlugins={[remarkGfm]}>{card.content}</Markdown>
          : <span className="text-gray-400 animate-pulse">讲解生成中…</span>
        }
      </div>

      {/* Translation section */}
      {card.translation !== null && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-sm text-blue-700 leading-relaxed prose prose-sm max-w-none prose-p:my-1">
          {card.translation
            ? <Markdown remarkPlugins={[remarkGfm]}>{card.translation}</Markdown>
            : <span className="text-xs text-gray-400 animate-pulse">翻译中…</span>
          }
        </div>
      )}

      {/* Action buttons */}
      <div
        className="mt-2 flex gap-2 items-center flex-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        {card.translation === null && card.content && (
          <button
            onClick={() => translate(card.id, card.sourceText !== '[图片区域]' ? card.sourceText : card.content)}
            disabled={isTranslatingThis}
            className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50"
          >
            翻译
          </button>
        )}
        <button
          onClick={() => { setNoteText(card.note || ''); setEditingNote(true) }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          {card.note ? '编辑笔记' : '+ 笔记'}
        </button>
      </div>

      {/* Note editor */}
      {editingNote && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            className="w-full text-xs border border-gray-200 rounded p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
            placeholder="添加笔记…"
            autoFocus
          />
          <div className="flex gap-2 mt-1">
            <button onClick={handleSaveNote} className="text-xs text-blue-500 hover:text-blue-700">保存</button>
            <button onClick={() => setEditingNote(false)} className="text-xs text-gray-400 hover:text-gray-600">取消</button>
          </div>
        </div>
      )}

      {/* Saved note display */}
      {card.note && !editingNote && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-green-700 bg-green-50 rounded p-1.5 whitespace-pre-wrap break-words">
          📝 {card.note}
        </div>
      )}
    </div>
  )
}
