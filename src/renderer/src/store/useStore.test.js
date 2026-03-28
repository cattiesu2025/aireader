import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useStore } from './useStore.js'

beforeEach(() => {
  useStore.setState({
    pdfPath: null,
    pdfHash: null,
    currentPage: 1,
    totalPages: 0,
    scale: 1.2,
    selection: null,
    cards: [],
    hoveredCardId: null,
    hoveredRectId: null,
  })
})

describe('useStore', () => {
  it('setHoveredCardId updates hoveredCardId', () => {
    const { result } = renderHook(() => useStore())
    act(() => result.current.setHoveredCardId('card-1'))
    expect(result.current.hoveredCardId).toBe('card-1')
  })

  it('setHoveredRectId updates hoveredRectId', () => {
    const { result } = renderHook(() => useStore())
    act(() => result.current.setHoveredRectId('card-2'))
    expect(result.current.hoveredRectId).toBe('card-2')
  })

  it('addCard appends to cards array', () => {
    const { result } = renderHook(() => useStore())
    act(() => result.current.addCard({ id: 'c1', content: '' }))
    expect(result.current.cards).toHaveLength(1)
    expect(result.current.cards[0].id).toBe('c1')
  })

  it('updateCard updates matching card', () => {
    const { result } = renderHook(() => useStore())
    act(() => result.current.addCard({ id: 'c1', content: 'old' }))
    act(() => result.current.updateCard('c1', { content: 'new' }))
    expect(result.current.cards[0].content).toBe('new')
  })

  it('setSelection sets selection state', () => {
    const { result } = renderHook(() => useStore())
    const sel = { type: 'text', text: 'hello', imageBase64: null, pageNum: 1, rect: { x: 0, y: 0, width: 10, height: 10 } }
    act(() => result.current.setSelection(sel))
    expect(result.current.selection).toEqual(sel)
  })

  it('clearSelection sets selection to null', () => {
    const { result } = renderHook(() => useStore())
    act(() => result.current.setSelection({ type: 'text', text: 'hi' }))
    act(() => result.current.clearSelection())
    expect(result.current.selection).toBeNull()
  })
})
