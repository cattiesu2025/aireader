import { useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { useHoverSync } from '../../hooks/useHoverSync.js'
import { useTranslate } from '../../hooks/useTranslate.js'
import { useStore } from '../../store/useStore.js'

const API = 'http://localhost:3799'

const MD_CLASS = `text-xs text-gray-700 leading-snug prose max-w-none
  prose-headings:font-semibold prose-headings:text-gray-800 prose-h1:text-sm prose-h2:text-sm prose-h3:text-xs
  prose-headings:mt-2 prose-headings:mb-0.5
  prose-p:my-0.5 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0 prose-li:leading-snug
  prose-table:text-xs prose-th:bg-gray-50 prose-td:border prose-th:border prose-td:px-1.5 prose-td:py-0.5 prose-th:px-1.5 prose-th:py-0.5
  prose-strong:text-gray-800 prose-code:text-xs prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded
  prose-blockquote:text-xs prose-blockquote:my-1`

export function ExplainCard({ card, onScrollToPDF }) {
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState(card.note || '')
  const { sidebarHandlers, isHighlightedFromPDF } = useHoverSync(card.id)
  const { translate, translatingId } = useTranslate()
  const { updateCard, removeCard } = useStore()

  const isTranslatingThis = translatingId === card.id

  const handleSaveNote = async () => {
    updateCard(card.id, { note: noteText })
    try {
      await fetch(`${API}/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText })
      })
    } catch {}
    setEditingNote(false)
  }

  const handleDeleteCard = async (e) => {
    e.stopPropagation()
    removeCard(card.id)
    try {
      await fetch(`${API}/api/cards/${card.id}`, { method: 'DELETE' })
    } catch {}
  }

  const handleDeleteTranslation = async (e) => {
    e.stopPropagation()
    updateCard(card.id, { translation: null })
    try {
      await fetch(`${API}/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ translation: null })
      })
    } catch {}
  }

  return (
    <div
      {...sidebarHandlers}
      onClick={() => onScrollToPDF?.(card)}
      className={`mb-2 p-2.5 bg-white rounded-lg border cursor-pointer transition-all duration-200 ${
        isHighlightedFromPDF
          ? 'animate-shake ring-2 ring-blue-400 border-blue-300 shadow-md'
          : 'border-gray-200 shadow-sm hover:border-blue-200 hover:shadow-md'
      }`}
    >
      {/* Header: page + source + delete */}
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className="text-xs text-gray-400 truncate flex-1">
          第 {card.pageNum} 页 · {card.sourceText}
        </p>
        <button
          onClick={handleDeleteCard}
          className="flex-shrink-0 text-gray-300 hover:text-red-400 text-xs leading-none ml-1"
          title="删除"
        >
          ✕
        </button>
      </div>

      {/* AI explanation content */}
      <div className={MD_CLASS}>
        {card.content ? (
          <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
            {card.content}
          </Markdown>
        ) : (
          <span className="text-gray-400 animate-pulse">讲解生成中…</span>
        )}
      </div>

      {/* Translation section */}
      {card.translation !== null && (
        <div className="mt-1.5 pt-1.5 border-t border-gray-100">
          <div className="flex items-start justify-between gap-1">
            <div className={`${MD_CLASS} text-blue-700 flex-1`}>
              {card.translation ? (
                <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {card.translation}
                </Markdown>
              ) : (
                <span className="text-gray-400 animate-pulse">翻译中…</span>
              )}
            </div>
            {card.translation && (
              <button
                onClick={handleDeleteTranslation}
                className="flex-shrink-0 text-gray-300 hover:text-red-400 text-xs leading-none ml-1 mt-0.5"
                title="删除翻译"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div
        className="mt-1.5 flex gap-2 items-center flex-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            setNoteText(card.note || '')
            setEditingNote(true)
          }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          {card.note ? '编辑笔记' : '+ 笔记'}
        </button>
      </div>

      {/* Note editor */}
      {editingNote && (
        <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            className="w-full text-xs border border-gray-200 rounded p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
            placeholder="添加笔记…"
            autoFocus
          />
          <div className="flex gap-2 mt-1">
            <button onClick={handleSaveNote} className="text-xs text-blue-500 hover:text-blue-700">
              保存
            </button>
            <button
              onClick={() => setEditingNote(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Saved note display */}
      {card.note && !editingNote && (
        <div className="mt-1.5 pt-1.5 border-t border-gray-100 text-xs text-green-700 bg-green-50 rounded p-1.5 whitespace-pre-wrap break-words">
          📝 {card.note}
        </div>
      )}
    </div>
  )
}
