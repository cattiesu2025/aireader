import { create } from 'zustand'

export const useStore = create((set) => ({
  // PDF state
  pdfPath: null,
  pdfHash: null,
  currentPage: 1,
  totalPages: 0,
  scale: 1.2,

  // Selection: { type: 'text'|'region', text, imageBase64, rect: {x,y,width,height}, pageNum }
  selection: null,

  // AI explanation cards
  cards: [],

  // Bidirectional hover sync
  hoveredCardId: null,
  hoveredRectId: null,

  // Actions
  setPdfPath: (path) => set({ pdfPath: path }),
  setPdfHash: (hash) => set({ pdfHash: hash }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setTotalPages: (n) => set({ totalPages: n }),
  setScale: (s) => set({ scale: s }),
  setSelection: (sel) => set({ selection: sel }),
  clearSelection: () => set({ selection: null }),
  setCards: (cards) => set({ cards }),
  addCard: (card) => set((s) => ({ cards: [card, ...s.cards] })),
  updateCard: (id, updates) =>
    set((s) => ({
      cards: s.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  setHoveredCardId: (id) => set({ hoveredCardId: id }),
  setHoveredRectId: (id) => set({ hoveredRectId: id }),
}))
