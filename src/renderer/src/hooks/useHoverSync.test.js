import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHoverSync } from './useHoverSync.js'
import { useStore } from '../store/useStore.js'

beforeEach(() => {
  useStore.setState({ hoveredCardId: null, hoveredRectId: null })
})

describe('useHoverSync', () => {
  it('sidebarHandlers.onMouseEnter sets hoveredCardId', () => {
    const { result } = renderHook(() => useHoverSync('card-1'))
    act(() => result.current.sidebarHandlers.onMouseEnter())
    expect(useStore.getState().hoveredCardId).toBe('card-1')
  })

  it('sidebarHandlers.onMouseLeave clears hoveredCardId', () => {
    const { result } = renderHook(() => useHoverSync('card-1'))
    act(() => result.current.sidebarHandlers.onMouseEnter())
    act(() => result.current.sidebarHandlers.onMouseLeave())
    expect(useStore.getState().hoveredCardId).toBeNull()
  })

  it('pdfHandlers.onMouseEnter sets hoveredRectId', () => {
    const { result } = renderHook(() => useHoverSync('card-1'))
    act(() => result.current.pdfHandlers.onMouseEnter())
    expect(useStore.getState().hoveredRectId).toBe('card-1')
  })

  it('pdfHandlers.onMouseLeave clears hoveredRectId', () => {
    const { result } = renderHook(() => useHoverSync('card-1'))
    act(() => result.current.pdfHandlers.onMouseEnter())
    act(() => result.current.pdfHandlers.onMouseLeave())
    expect(useStore.getState().hoveredRectId).toBeNull()
  })

  it('isHighlightedFromSidebar is true when hoveredCardId matches', () => {
    useStore.setState({ hoveredCardId: 'card-1' })
    const { result } = renderHook(() => useHoverSync('card-1'))
    expect(result.current.isHighlightedFromSidebar).toBe(true)
  })

  it('isHighlightedFromPDF is true when hoveredRectId matches', () => {
    useStore.setState({ hoveredRectId: 'card-1' })
    const { result } = renderHook(() => useHoverSync('card-1'))
    expect(result.current.isHighlightedFromPDF).toBe(true)
  })

  it('isHighlightedFromSidebar is false for a different cardId', () => {
    useStore.setState({ hoveredCardId: 'card-2' })
    const { result } = renderHook(() => useHoverSync('card-1'))
    expect(result.current.isHighlightedFromSidebar).toBe(false)
  })
})
