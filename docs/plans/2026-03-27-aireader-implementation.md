# AIReader Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal Electron desktop app for PDF study with AI-powered on-demand explanations via claude-code-router.

**Architecture:** Electron app with embedded Express server (auto-start in Main process). React renderer communicates with Express via fetch/SSE. Express proxies to claude-code-router (OpenAI-compatible, :3000). LowDB persists cards and progress as JSON files.

**Tech Stack:** Electron + electron-vite, React, Tailwind CSS, Zustand, react-pdf, LowDB v3, Express, SSE, claude-code-router

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.js`
- Create: `src/main/index.js`
- Create: `src/preload/index.js`
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.jsx`
- Create: `src/renderer/src/App.jsx`

**Step 1: Scaffold with electron-vite**

```bash
cd /Users/cattie/Desktop/project/aireader
npm create @quick-start/electron@latest . -- --template react
```

When prompted: project name = `aireader`, template = `react`.

**Step 2: Install dependencies**

```bash
npm install
npm install express lowdb react-pdf zustand
npm install -D tailwindcss postcss autoprefixer @tailwindcss/vite
```

**Step 3: Init Tailwind**

```bash
npx tailwindcss init -p
```

**Step 4: Configure Tailwind**

Edit `tailwind.config.js`:
```js
export default {
  content: ['./src/renderer/src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Add to `src/renderer/src/index.css` (create if needed):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.animate-shake { animation: shake 0.4s ease-in-out; }
```

**Step 5: Verify scaffold runs**

```bash
npm run dev
```

Expected: Electron window opens with default vite+react template.

**Step 6: Commit**

```bash
git init
echo "node_modules\ndata\ndist\nout" > .gitignore
git add .
git commit -m "feat: scaffold electron-vite + react + tailwind project"
```

---

## Task 2: LowDB Setup

**Files:**
- Create: `src/main/db/index.js`
- Create: `src/main/db/cards.js`
- Create: `src/main/db/progress.js`
- Create: `src/main/db/index.test.js`

**Step 1: Write failing test**

Create `src/main/db/index.test.js`:
```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { initDB } from './index.js'

const TEST_DATA_DIR = path.join(process.cwd(), 'data-test')

describe('LowDB init', () => {
  afterEach(() => {
    if (fs.existsSync(TEST_DATA_DIR)) fs.rmSync(TEST_DATA_DIR, { recursive: true })
  })

  it('creates data directory and returns db instances', async () => {
    const { cardsDB, progressDB } = await initDB(TEST_DATA_DIR)
    expect(cardsDB).toBeDefined()
    expect(progressDB).toBeDefined()
    expect(fs.existsSync(path.join(TEST_DATA_DIR, 'cards.json'))).toBe(true)
    expect(fs.existsSync(path.join(TEST_DATA_DIR, 'progress.json'))).toBe(true)
  })
})
```

**Step 2: Add vitest to package.json**

Add to `package.json` scripts:
```json
"test": "vitest run src/main"
```

Add vitest dev dependency:
```bash
npm install -D vitest
```

Run test to confirm failure:
```bash
npm test
```
Expected: FAIL — `initDB` not found.

**Step 3: Implement LowDB init**

Create `src/main/db/index.js`:
```js
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import path from 'path'
import fs from 'fs'

export async function initDB(dataDir) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

  const cardsDB = new Low(new JSONFile(path.join(dataDir, 'cards.json')), { cards: [] })
  const progressDB = new Low(new JSONFile(path.join(dataDir, 'progress.json')), { progress: [] })

  await cardsDB.read()
  await progressDB.read()

  return { cardsDB, progressDB }
}
```

**Step 4: Run test**

```bash
npm test
```
Expected: PASS.

**Step 5: Implement cards CRUD**

Create `src/main/db/cards.js`:
```js
import { nanoid } from 'nanoid'

export function getCards(db, pdfHash) {
  return db.data.cards.filter(c => c.pdfHash === pdfHash)
}

export async function saveCard(db, card) {
  const newCard = { id: nanoid(), createdAt: Date.now(), ...card }
  db.data.cards.push(newCard)
  await db.write()
  return newCard
}

export async function updateCard(db, id, updates) {
  const idx = db.data.cards.findIndex(c => c.id === id)
  if (idx === -1) throw new Error('Card not found')
  db.data.cards[idx] = { ...db.data.cards[idx], ...updates }
  await db.write()
  return db.data.cards[idx]
}

export async function deleteCard(db, id) {
  db.data.cards = db.data.cards.filter(c => c.id !== id)
  await db.write()
}
```

**Step 6: Implement progress CRUD**

Create `src/main/db/progress.js`:
```js
export function getProgress(db, pdfHash) {
  return db.data.progress.find(p => p.pdfHash === pdfHash) || null
}

export async function saveProgress(db, pdfHash, page, scrollY) {
  const idx = db.data.progress.findIndex(p => p.pdfHash === pdfHash)
  const entry = { pdfHash, page, scrollY, updatedAt: Date.now() }
  if (idx === -1) db.data.progress.push(entry)
  else db.data.progress[idx] = entry
  await db.write()
}
```

Install nanoid:
```bash
npm install nanoid
```

**Step 7: Commit**

```bash
git add src/main/db
git commit -m "feat: add LowDB setup with cards and progress CRUD"
```

---

## Task 3: Express Server + Routes

**Files:**
- Create: `src/main/server/index.js`
- Create: `src/main/server/routes/cards.js`
- Create: `src/main/server/routes/progress.js`
- Create: `src/main/server/routes/explain.js`
- Create: `src/main/server/routes/translate.js`
- Create: `src/main/server/claude.js`

**Step 1: Write failing test for cards route**

Create `src/main/server/routes/cards.test.js`:
```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createCardsRouter } from './cards.js'

const mockDB = {
  data: { cards: [] },
  write: async () => {}
}

describe('GET /api/cards', () => {
  let app
  beforeAll(() => {
    app = express()
    app.use(express.json())
    app.use('/api/cards', createCardsRouter(mockDB))
  })

  it('returns empty array for unknown pdfHash', async () => {
    const res = await request(app).get('/api/cards?pdfHash=abc123')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})
```

Install supertest:
```bash
npm install -D supertest
```

Run:
```bash
npm test
```
Expected: FAIL.

**Step 2: Implement cards route**

Create `src/main/server/routes/cards.js`:
```js
import { Router } from 'express'
import { getCards, saveCard, updateCard, deleteCard } from '../../db/cards.js'

export function createCardsRouter(db) {
  const router = Router()

  router.get('/', (req, res) => {
    const { pdfHash } = req.query
    res.json(getCards(db, pdfHash))
  })

  router.post('/', async (req, res) => {
    const card = await saveCard(db, req.body)
    res.json(card)
  })

  router.patch('/:id', async (req, res) => {
    const card = await updateCard(db, req.params.id, req.body)
    res.json(card)
  })

  router.delete('/:id', async (req, res) => {
    await deleteCard(db, req.params.id)
    res.json({ ok: true })
  })

  return router
}
```

Run test:
```bash
npm test
```
Expected: PASS.

**Step 3: Implement progress route**

Create `src/main/server/routes/progress.js`:
```js
import { Router } from 'express'
import { getProgress, saveProgress } from '../../db/progress.js'

export function createProgressRouter(db) {
  const router = Router()

  router.get('/', (req, res) => {
    const { pdfHash } = req.query
    res.json(getProgress(db, pdfHash))
  })

  router.put('/', async (req, res) => {
    const { pdfHash, page, scrollY } = req.body
    await saveProgress(db, pdfHash, page, scrollY)
    res.json({ ok: true })
  })

  return router
}
```

**Step 4: Implement claude.js (claude-code-router proxy)**

Create `src/main/server/claude.js`:
```js
const ROUTER_BASE = 'http://localhost:3000'

const SYSTEM_PROMPT = `你是一位专业的学习辅导助手。
请始终用中文回答，语言简洁清晰，适合学习理解。`

export async function streamExplain(messages, onChunk, onDone) {
  const response = await fetch(`${ROUTER_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer dummy' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      stream: true,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
  })

  if (!response.ok) throw new Error(`Router error: ${response.status}`)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') { onDone(); return }
      try {
        const json = JSON.parse(data)
        const chunk = json.choices?.[0]?.delta?.content
        if (chunk) onChunk(chunk)
      } catch {}
    }
  }
  onDone()
}
```

**Step 5: Implement explain route (SSE)**

Create `src/main/server/routes/explain.js`:
```js
import { Router } from 'express'
import { streamExplain } from '../claude.js'

export function createExplainRouter() {
  const router = Router()

  router.post('/', async (req, res) => {
    const { text, imageBase64 } = req.body

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const content = imageBase64
      ? [
          { type: 'image_url', image_url: { url: imageBase64 } },
          { type: 'text', text: '请分析这张图表并用中文详细讲解其内容和含义。' },
        ]
      : `请用中文讲解以下内容，语言简洁易懂：\n\n${text}`

    try {
      await streamExplain(
        [{ role: 'user', content }],
        (chunk) => res.write(`data: ${JSON.stringify({ chunk })}\n\n`),
        () => { res.write('data: [DONE]\n\n'); res.end() }
      )
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    }
  })

  return router
}
```

**Step 6: Implement translate route (SSE)**

Create `src/main/server/routes/translate.js`:
```js
import { Router } from 'express'
import { streamExplain } from '../claude.js'

export function createTranslateRouter() {
  const router = Router()

  router.post('/', async (req, res) => {
    const { text } = req.body

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    try {
      await streamExplain(
        [{ role: 'user', content: `请将以下内容翻译成中文，保持学术准确性：\n\n${text}` }],
        (chunk) => res.write(`data: ${JSON.stringify({ chunk })}\n\n`),
        () => { res.write('data: [DONE]\n\n'); res.end() }
      )
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    }
  })

  return router
}
```

**Step 7: Implement Express app entry**

Create `src/main/server/index.js`:
```js
import express from 'express'
import cors from 'cors'
import { createCardsRouter } from './routes/cards.js'
import { createProgressRouter } from './routes/progress.js'
import { createExplainRouter } from './routes/explain.js'
import { createTranslateRouter } from './routes/translate.js'

const PORT = 3799

export function startServer(cardsDB, progressDB) {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '20mb' }))

  app.use('/api/cards', createCardsRouter(cardsDB))
  app.use('/api/progress', createProgressRouter(progressDB))
  app.use('/api/explain', createExplainRouter())
  app.use('/api/translate', createTranslateRouter())

  const server = app.listen(PORT, () => {
    console.log(`[server] listening on :${PORT}`)
  })

  return server
}
```

Install cors:
```bash
npm install cors
```

**Step 8: Wire server into Electron Main**

Edit `src/main/index.js` to add after existing imports:
```js
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import path from 'path'
import { initDB } from './db/index.js'
import { startServer } from './server/index.js'

const DATA_DIR = path.join(app.getPath('userData'), 'data')
let server

app.whenReady().then(async () => {
  const { cardsDB, progressDB } = await initDB(DATA_DIR)
  server = startServer(cardsDB, progressDB)
  createWindow()
})

app.on('before-quit', () => { server?.close() })

// IPC: open file dialog
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({ filters: [{ name: 'PDF', extensions: ['pdf'] }] })
  return result.canceled ? null : result.filePaths[0]
})
```

**Step 9: Expose IPC in preload**

Edit `src/preload/index.js`:
```js
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
})
```

**Step 10: Commit**

```bash
git add src/main/server src/main/index.js src/preload/index.js
git commit -m "feat: add express server with SSE explain/translate routes and LowDB wiring"
```

---

## Task 4: Core Utilities (pdfHash + captureRegion)

**Files:**
- Create: `src/renderer/src/lib/pdfHash.js`
- Create: `src/renderer/src/lib/captureRegion.js`
- Create: `src/renderer/src/lib/pdfHash.test.js`

**Step 1: Write failing test for pdfHash**

Create `src/renderer/src/lib/pdfHash.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { hashFile } from './pdfHash.js'

describe('hashFile', () => {
  it('returns a 64-char hex string for any ArrayBuffer', async () => {
    const buf = new TextEncoder().encode('hello world').buffer
    const hash = await hashFile(buf)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns the same hash for identical content', async () => {
    const buf = new TextEncoder().encode('same content').buffer
    const h1 = await hashFile(buf)
    const h2 = await hashFile(buf)
    expect(h1).toBe(h2)
  })
})
```

Run:
```bash
npm test
```
Expected: FAIL.

**Step 2: Implement pdfHash**

Create `src/renderer/src/lib/pdfHash.js`:
```js
export async function hashFile(arrayBuffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
```

Run:
```bash
npm test
```
Expected: PASS.

**Step 3: Implement captureRegion**

Create `src/renderer/src/lib/captureRegion.js`:
```js
/**
 * Captures a rectangular region from a pdf.js canvas element.
 * @param {HTMLCanvasElement} pdfCanvas - The canvas rendered by react-pdf
 * @param {{ x: number, y: number, width: number, height: number }} rect - in CSS pixels
 * @param {number} scale - current PDF zoom scale (devicePixelRatio * zoom)
 * @returns {Promise<string>} base64 data URL (image/png)
 */
export async function captureRegion(pdfCanvas, rect, scale) {
  const sx = rect.x * scale
  const sy = rect.y * scale
  const sw = rect.width * scale
  const sh = rect.height * scale

  const offscreen = new OffscreenCanvas(Math.round(sw), Math.round(sh))
  const ctx = offscreen.getContext('2d')
  ctx.drawImage(pdfCanvas, sx, sy, sw, sh, 0, 0, Math.round(sw), Math.round(sh))

  const blob = await offscreen.convertToBlob({ type: 'image/png' })
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}
```

**Step 4: Commit**

```bash
git add src/renderer/src/lib
git commit -m "feat: add pdfHash (SHA-256) and captureRegion utilities"
```

---

## Task 5: Zustand Store

**Files:**
- Create: `src/renderer/src/store/useStore.js`
- Create: `src/renderer/src/store/useStore.test.js`

**Step 1: Write failing test**

Create `src/renderer/src/store/useStore.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useStore } from './useStore.js'

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState({
      pdfHash: null, currentPage: 1, cards: [],
      hoveredCardId: null, hoveredRectId: null, selection: null,
    })
  })

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
  })
})
```

Install testing deps:
```bash
npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

Add to `vitest.config.js` (or `vite.config.js` test section):
```js
test: { environment: 'jsdom' }
```

Run:
```bash
npm test
```
Expected: FAIL.

**Step 2: Implement store**

Create `src/renderer/src/store/useStore.js`:
```js
import { create } from 'zustand'

export const useStore = create((set) => ({
  // PDF state
  pdfPath: null,
  pdfHash: null,
  currentPage: 1,
  totalPages: 0,
  scale: 1.2,

  // Selection
  selection: null,   // { type, text, imageBase64, rect, pageNum }

  // Cards
  cards: [],

  // Hover sync
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
    set((s) => ({ cards: s.cards.map(c => c.id === id ? { ...c, ...updates } : c) })),
  setHoveredCardId: (id) => set({ hoveredCardId: id }),
  setHoveredRectId: (id) => set({ hoveredRectId: id }),
}))
```

Run:
```bash
npm test
```
Expected: PASS.

**Step 3: Commit**

```bash
git add src/renderer/src/store
git commit -m "feat: add Zustand store with hover sync state"
```

---

## Task 6: useHoverSync Hook

**Files:**
- Create: `src/renderer/src/hooks/useHoverSync.js`
- Create: `src/renderer/src/hooks/useHoverSync.test.js`

**Step 1: Write failing test**

Create `src/renderer/src/hooks/useHoverSync.test.js`:
```js
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

  it('isHighlightedFromPDF is true when hoveredRectId matches', () => {
    useStore.setState({ hoveredRectId: 'card-1' })
    const { result } = renderHook(() => useHoverSync('card-1'))
    expect(result.current.isHighlightedFromPDF).toBe(true)
  })
})
```

Run:
```bash
npm test
```
Expected: FAIL.

**Step 2: Implement hook**

Create `src/renderer/src/hooks/useHoverSync.js`:
```js
import { useStore } from '../store/useStore.js'

export function useHoverSync(cardId) {
  const hoveredCardId = useStore(s => s.hoveredCardId)
  const hoveredRectId = useStore(s => s.hoveredRectId)
  const setHoveredCardId = useStore(s => s.setHoveredCardId)
  const setHoveredRectId = useStore(s => s.setHoveredRectId)

  return {
    sidebarHandlers: {
      onMouseEnter: () => setHoveredCardId(cardId),
      onMouseLeave: () => setHoveredCardId(null),
    },
    pdfHandlers: {
      onMouseEnter: () => setHoveredRectId(cardId),
      onMouseLeave: () => setHoveredRectId(null),
    },
    isHighlightedFromSidebar: hoveredCardId === cardId,
    isHighlightedFromPDF: hoveredRectId === cardId,
  }
}
```

Run:
```bash
npm test
```
Expected: PASS.

**Step 3: Commit**

```bash
git add src/renderer/src/hooks/useHoverSync.js src/renderer/src/hooks/useHoverSync.test.js
git commit -m "feat: add useHoverSync hook for bidirectional PDF-sidebar hover sync"
```

---

## Task 7: useExplain + useTranslate Hooks

**Files:**
- Create: `src/renderer/src/hooks/useExplain.js`
- Create: `src/renderer/src/hooks/useTranslate.js`

**Step 1: Implement useExplain**

Create `src/renderer/src/hooks/useExplain.js`:
```js
import { useState, useCallback } from 'react'
import { useStore } from '../store/useStore.js'

const API = 'http://localhost:3799'

export function useExplain() {
  const [streaming, setStreaming] = useState(false)
  const { addCard, updateCard, pdfHash } = useStore()

  const explain = useCallback(async (selection) => {
    if (streaming) return

    // Immediately add placeholder card
    const tempCard = {
      id: `temp-${Date.now()}`,
      pdfHash,
      pageNum: selection.pageNum,
      rect: selection.rect,
      sourceText: selection.text || '[图片区域]',
      content: '',
      translation: null,
      note: '',
      createdAt: Date.now(),
    }
    addCard(tempCard)
    setStreaming(true)

    let fullContent = ''

    try {
      const res = await fetch(`${API}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selection.text,
          imageBase64: selection.imageBase64,
          pdfHash,
          pageNum: selection.pageNum,
          rect: selection.rect,
        }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const { chunk } = JSON.parse(data)
            if (chunk) {
              fullContent += chunk
              updateCard(tempCard.id, { content: fullContent })
            }
          } catch {}
        }
      }

      // Persist to backend
      const saved = await fetch(`${API}/api/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...tempCard, id: undefined, content: fullContent }),
      }).then(r => r.json())

      // Replace temp card with persisted card (has real id)
      updateCard(tempCard.id, { id: saved.id, content: fullContent })
    } finally {
      setStreaming(false)
    }
  }, [streaming, pdfHash, addCard, updateCard])

  return { explain, streaming }
}
```

**Step 2: Implement useTranslate**

Create `src/renderer/src/hooks/useTranslate.js`:
```js
import { useState, useCallback } from 'react'
import { useStore } from '../store/useStore.js'

const API = 'http://localhost:3799'

export function useTranslate() {
  const [translating, setTranslating] = useState(false)
  const { updateCard } = useStore()

  const translate = useCallback(async (cardId, text) => {
    if (translating) return
    setTranslating(true)
    updateCard(cardId, { translation: '' })

    let fullTranslation = ''
    try {
      const res = await fetch(`${API}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const { chunk } = JSON.parse(data)
            if (chunk) {
              fullTranslation += chunk
              updateCard(cardId, { translation: fullTranslation })
            }
          } catch {}
        }
      }

      // Persist
      await fetch(`${API}/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ translation: fullTranslation }),
      })
    } finally {
      setTranslating(false)
    }
  }, [translating, updateCard])

  return { translate, translating }
}
```

**Step 3: Commit**

```bash
git add src/renderer/src/hooks/useExplain.js src/renderer/src/hooks/useTranslate.js
git commit -m "feat: add useExplain and useTranslate hooks with SSE streaming"
```

---

## Task 8: usePDFSelection Hook

**Files:**
- Create: `src/renderer/src/hooks/usePDFSelection.js`

Create `src/renderer/src/hooks/usePDFSelection.js`:
```js
import { useState, useCallback, useEffect } from 'react'
import { useStore } from '../store/useStore.js'
import { captureRegion } from '../lib/captureRegion.js'

export function usePDFSelection(pdfContainerRef, currentPage, scale) {
  const [mode, setMode] = useState('text')    // 'text' | 'region'
  const [drawing, setDrawing] = useState(false)
  const [startPos, setStartPos] = useState(null)
  const [currentRect, setCurrentRect] = useState(null)
  const setSelection = useStore(s => s.setSelection)

  // Text selection via browser native
  useEffect(() => {
    if (mode !== 'text') return
    const handleMouseUp = () => {
      const sel = window.getSelection()
      const text = sel?.toString().trim()
      if (!text) return
      const range = sel.getRangeAt(0)
      const containerRect = pdfContainerRef.current?.getBoundingClientRect()
      if (!containerRect) return
      const domRect = range.getBoundingClientRect()
      setSelection({
        type: 'text',
        text,
        imageBase64: null,
        pageNum: currentPage,
        rect: {
          x: domRect.left - containerRect.left,
          y: domRect.top - containerRect.top,
          width: domRect.width,
          height: domRect.height,
        },
      })
    }
    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [mode, currentPage, pdfContainerRef, setSelection])

  // Region selection handlers
  const onRegionMouseDown = useCallback((e) => {
    if (mode !== 'region') return
    const rect = pdfContainerRef.current.getBoundingClientRect()
    setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setDrawing(true)
    setCurrentRect(null)
  }, [mode, pdfContainerRef])

  const onRegionMouseMove = useCallback((e) => {
    if (!drawing || !startPos) return
    const rect = pdfContainerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setCurrentRect({
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y),
    })
  }, [drawing, startPos, pdfContainerRef])

  const onRegionMouseUp = useCallback(async () => {
    if (!drawing || !currentRect) return
    setDrawing(false)
    if (currentRect.width < 10 || currentRect.height < 10) return

    // Find the pdf.js canvas in the container
    const canvas = pdfContainerRef.current?.querySelector('canvas')
    if (!canvas) return

    const imageBase64 = await captureRegion(canvas, currentRect, scale)
    setSelection({
      type: 'region',
      text: null,
      imageBase64,
      pageNum: currentPage,
      rect: currentRect,
    })
  }, [drawing, currentRect, pdfContainerRef, scale, currentPage, setSelection])

  return {
    mode, setMode,
    currentRect, drawing,
    regionHandlers: { onMouseDown: onRegionMouseDown, onMouseMove: onRegionMouseMove, onMouseUp: onRegionMouseUp },
  }
}
```

**Step 2: Commit**

```bash
git add src/renderer/src/hooks/usePDFSelection.js
git commit -m "feat: add usePDFSelection hook for text and region selection modes"
```

---

## Task 9: PDF Viewer Component

**Files:**
- Create: `src/renderer/src/components/PDFViewer/index.jsx`
- Create: `src/renderer/src/components/PDFViewer/SelectionOverlay.jsx`
- Create: `src/renderer/src/components/PDFViewer/ExplainButton.jsx`

**Step 1: Implement SelectionOverlay**

Create `src/renderer/src/components/PDFViewer/SelectionOverlay.jsx`:
```jsx
import { useStore } from '../../store/useStore.js'
import { useHoverSync } from '../../hooks/useHoverSync.js'

// Renders all persisted card rects as colored overlays on the PDF
export function SelectionOverlay({ cards, pageNum, scale, containerRect }) {
  const pageCards = cards.filter(c => c.pageNum === pageNum)

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {pageCards.map(card => (
        <CardRect key={card.id} card={card} scale={scale} />
      ))}
    </div>
  )
}

function CardRect({ card }) {
  const { pdfHandlers, isHighlightedFromSidebar } = useHoverSync(card.id)
  const { rect } = card

  return (
    <div
      {...pdfHandlers}
      className={`absolute pointer-events-auto cursor-pointer transition-all
        ${isHighlightedFromSidebar
          ? 'bg-blue-300/40 ring-2 ring-blue-500 animate-pulse'
          : 'bg-yellow-200/30 ring-1 ring-yellow-400'
        }`}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
    />
  )
}
```

**Step 2: Implement ExplainButton**

Create `src/renderer/src/components/PDFViewer/ExplainButton.jsx`:
```jsx
import { useStore } from '../../store/useStore.js'
import { useExplain } from '../../hooks/useExplain.js'

export function ExplainButton() {
  const selection = useStore(s => s.selection)
  const clearSelection = useStore(s => s.clearSelection)
  const { explain, streaming } = useExplain()

  if (!selection) return null

  const { rect } = selection

  const handleExplain = async () => {
    await explain(selection)
    clearSelection()
  }

  return (
    <div
      className="absolute z-20 flex gap-1"
      style={{ left: rect.x, top: rect.y + rect.height + 4 }}
    >
      <button
        onClick={handleExplain}
        disabled={streaming}
        className="px-3 py-1 bg-blue-600 text-white text-xs rounded shadow hover:bg-blue-700 disabled:opacity-50"
      >
        {streaming ? '讲解中…' : '讲解'}
      </button>
      <button
        onClick={clearSelection}
        className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded shadow hover:bg-gray-300"
      >
        ✕
      </button>
    </div>
  )
}
```

**Step 3: Implement PDFViewer**

Create `src/renderer/src/components/PDFViewer/index.jsx`:
```jsx
import { useRef, useEffect, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useStore } from '../../store/useStore.js'
import { usePDFSelection } from '../../hooks/usePDFSelection.js'
import { SelectionOverlay } from './SelectionOverlay.jsx'
import { ExplainButton } from './ExplainButton.jsx'
import { hashFile } from '../../lib/pdfHash.js'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const API = 'http://localhost:3799'

export function PDFViewer({ filePath }) {
  const containerRef = useRef(null)
  const {
    currentPage, totalPages, scale, cards, pdfHash,
    setCurrentPage, setTotalPages, setPdfHash, setCards,
  } = useStore()

  const { mode, setMode, currentRect, drawing, regionHandlers } =
    usePDFSelection(containerRef, currentPage, scale)

  // Load file as ArrayBuffer → compute hash → load cards from DB
  useEffect(() => {
    if (!filePath) return
    ;(async () => {
      const buf = await window.electron.readFile(filePath)
      const hash = await hashFile(buf)
      setPdfHash(hash)

      const cards = await fetch(`${API}/api/cards?pdfHash=${hash}`).then(r => r.json())
      setCards(cards)

      const progress = await fetch(`${API}/api/progress?pdfHash=${hash}`).then(r => r.json())
      if (progress) setCurrentPage(progress.page)
    })()
  }, [filePath])

  // Save progress on page change
  useEffect(() => {
    if (!pdfHash) return
    fetch(`${API}/api/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfHash, page: currentPage, scrollY: 0 }),
    })
  }, [currentPage, pdfHash])

  if (!filePath) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        请从工具栏打开 PDF 文件
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-100 flex flex-col items-center p-4">
      <div
        ref={containerRef}
        className="relative select-text"
        style={{ cursor: mode === 'region' ? 'crosshair' : 'text' }}
        {...(mode === 'region' ? regionHandlers : {})}
      >
        <Document
          file={filePath}
          onLoadSuccess={({ numPages }) => setTotalPages(numPages)}
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            renderTextLayer={mode === 'text'}
            renderAnnotationLayer={false}
          />
        </Document>

        <SelectionOverlay cards={cards} pageNum={currentPage} scale={scale} />
        <ExplainButton />

        {/* Region drawing preview */}
        {drawing && currentRect && (
          <div
            className="absolute border-2 border-blue-500 border-dashed bg-blue-100/20 pointer-events-none z-20"
            style={{
              left: currentRect.x, top: currentRect.y,
              width: currentRect.width, height: currentRect.height,
            }}
          />
        )}
      </div>

      {/* Page navigation */}
      <div className="flex items-center gap-3 mt-4 text-sm text-gray-600">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-40"
        >
          ‹ 上一页
        </button>
        <span>{currentPage} / {totalPages}</span>
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="px-3 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-40"
        >
          下一页 ›
        </button>
      </div>
    </div>
  )
}
```

**Step 4: Add readFile IPC in preload + main**

In `src/preload/index.js`, add:
```js
readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
```

In `src/main/index.js`, add:
```js
import fs from 'fs'
ipcMain.handle('read-file', async (_, filePath) => {
  const buf = fs.readFileSync(filePath)
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
})
```

**Step 5: Commit**

```bash
git add src/renderer/src/components/PDFViewer src/preload/index.js src/main/index.js
git commit -m "feat: add PDFViewer with selection overlay, explain button, and progress sync"
```

---

## Task 10: Sidebar + ExplainCard Component

**Files:**
- Create: `src/renderer/src/components/Sidebar/index.jsx`
- Create: `src/renderer/src/components/Sidebar/ExplainCard.jsx`
- Create: `src/renderer/src/components/Sidebar/TranslateButton.jsx`

**Step 1: Implement ExplainCard**

Create `src/renderer/src/components/Sidebar/ExplainCard.jsx`:
```jsx
import { useState } from 'react'
import { useHoverSync } from '../../hooks/useHoverSync.js'
import { useTranslate } from '../../hooks/useTranslate.js'
import { useStore } from '../../store/useStore.js'

const API = 'http://localhost:3799'

export function ExplainCard({ card, onScrollToPDF }) {
  const [editingNote, setEditingNote] = useState(false)
  const [note, setNote] = useState(card.note || '')
  const { sidebarHandlers, isHighlightedFromPDF } = useHoverSync(card.id)
  const { translate, translating } = useTranslate()
  const updateCard = useStore(s => s.updateCard)

  const handleSaveNote = async () => {
    updateCard(card.id, { note })
    await fetch(`${API}/api/cards/${card.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    })
    setEditingNote(false)
  }

  return (
    <div
      {...sidebarHandlers}
      onClick={() => onScrollToPDF(card)}
      className={`mb-3 p-3 bg-white rounded-lg shadow-sm border cursor-pointer transition-all
        ${isHighlightedFromPDF ? 'animate-shake ring-2 ring-blue-400 border-blue-300' : 'border-gray-200 hover:border-blue-200'}`}
    >
      {/* Source text */}
      <p className="text-xs text-gray-400 mb-1 truncate">第 {card.pageNum} 页 · {card.sourceText}</p>

      {/* AI explanation */}
      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {card.content || <span className="text-gray-400 animate-pulse">讲解生成中…</span>}
      </div>

      {/* Translation */}
      {card.translation !== null && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-sm text-blue-700 leading-relaxed whitespace-pre-wrap">
          {card.translation || <span className="text-gray-400 animate-pulse">翻译中…</span>}
        </div>
      )}

      {/* Actions */}
      <div className="mt-2 flex gap-2 items-center" onClick={e => e.stopPropagation()}>
        {card.translation === null && (
          <button
            onClick={() => translate(card.id, card.sourceText || card.content)}
            disabled={translating}
            className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-50"
          >
            翻译
          </button>
        )}
        <button
          onClick={() => setEditingNote(true)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          {card.note ? '编辑笔记' : '+ 笔记'}
        </button>
      </div>

      {/* Note editor */}
      {editingNote && (
        <div className="mt-2" onClick={e => e.stopPropagation()}>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            className="w-full text-xs border rounded p-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
            placeholder="添加笔记…"
            autoFocus
          />
          <div className="flex gap-2 mt-1">
            <button onClick={handleSaveNote} className="text-xs text-blue-500 hover:text-blue-700">保存</button>
            <button onClick={() => setEditingNote(false)} className="text-xs text-gray-400 hover:text-gray-600">取消</button>
          </div>
        </div>
      )}

      {card.note && !editingNote && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-green-700 bg-green-50 rounded p-1">
          📝 {card.note}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Implement Sidebar**

Create `src/renderer/src/components/Sidebar/index.jsx`:
```jsx
import { useStore } from '../../store/useStore.js'
import { ExplainCard } from './ExplainCard.jsx'

export function Sidebar({ pdfViewerRef }) {
  const cards = useStore(s => s.cards)
  const pdfHash = useStore(s => s.pdfHash)

  const currentCards = cards.filter(c => c.pdfHash === pdfHash)

  const handleScrollToPDF = (card) => {
    pdfViewerRef?.current?.scrollToCard(card)
  }

  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-sm font-medium text-gray-700">AI 讲解</h2>
        <p className="text-xs text-gray-400 mt-0.5">{currentCards.length} 条记录</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {currentCards.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-8">
            选中 PDF 文字或区域后<br />点击「讲解」按钮生成解析
          </p>
        ) : (
          currentCards.map(card => (
            <ExplainCard key={card.id} card={card} onScrollToPDF={handleScrollToPDF} />
          ))
        )}
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/renderer/src/components/Sidebar
git commit -m "feat: add Sidebar with ExplainCard, hover sync, translate, and note editing"
```

---

## Task 11: Toolbar Component

**Files:**
- Create: `src/renderer/src/components/Toolbar/index.jsx`

Create `src/renderer/src/components/Toolbar/index.jsx`:
```jsx
import { useStore } from '../../store/useStore.js'

export function Toolbar({ onOpenFile, selectionMode, onModeChange }) {
  const { currentPage, totalPages, scale, setScale } = useStore()

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 text-sm">
      <button
        onClick={onOpenFile}
        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
      >
        打开 PDF
      </button>

      <div className="h-4 w-px bg-gray-200" />

      {/* Selection mode toggle */}
      <div className="flex rounded border border-gray-200 overflow-hidden">
        <button
          onClick={() => onModeChange('text')}
          className={`px-2 py-1 text-xs ${selectionMode === 'text' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
          title="文字选区"
        >
          T 文字
        </button>
        <button
          onClick={() => onModeChange('region')}
          className={`px-2 py-1 text-xs border-l border-gray-200 ${selectionMode === 'region' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
          title="框选区域 (Shift)"
        >
          ⬚ 区域
        </button>
      </div>

      <div className="h-4 w-px bg-gray-200" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <button onClick={() => setScale(Math.max(0.5, scale - 0.1))} className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded">−</button>
        <span className="text-xs text-gray-500 w-10 text-center">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(Math.min(3, scale + 0.1))} className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded">+</button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/src/components/Toolbar
git commit -m "feat: add Toolbar with file open, mode toggle, and zoom controls"
```

---

## Task 12: App Layout Wiring

**Files:**
- Modify: `src/renderer/src/App.jsx`

**Step 1: Implement App.jsx**

Replace contents of `src/renderer/src/App.jsx`:
```jsx
import { useState, useRef } from 'react'
import { PDFViewer } from './components/PDFViewer/index.jsx'
import { Sidebar } from './components/Sidebar/index.jsx'
import { Toolbar } from './components/Toolbar/index.jsx'
import { useStore } from './store/useStore.js'

export default function App() {
  const [filePath, setFilePath] = useState(null)
  const [selectionMode, setSelectionMode] = useState('text')
  const pdfViewerRef = useRef(null)
  const setPdfPath = useStore(s => s.setPdfPath)

  const handleOpenFile = async () => {
    const path = await window.electron.openFileDialog()
    if (path) {
      setFilePath(path)
      setPdfPath(path)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <Toolbar
        onOpenFile={handleOpenFile}
        selectionMode={selectionMode}
        onModeChange={setSelectionMode}
      />
      <div className="flex-1 flex overflow-hidden">
        <PDFViewer ref={pdfViewerRef} filePath={filePath} selectionMode={selectionMode} />
        <Sidebar pdfViewerRef={pdfViewerRef} />
      </div>
    </div>
  )
}
```

**Step 2: Pass selectionMode into PDFViewer**

In `src/renderer/src/components/PDFViewer/index.jsx`, update `usePDFSelection` call to accept `selectionMode` prop:
```jsx
// Add selectionMode to component props
export const PDFViewer = forwardRef(({ filePath, selectionMode }, ref) => {
  // ...
  const { mode, setMode, ... } = usePDFSelection(containerRef, currentPage, scale)

  // Sync external mode
  useEffect(() => { setMode(selectionMode) }, [selectionMode])
  // ...
})
```

Import `forwardRef` from react. Expose `scrollToCard` via `useImperativeHandle`:
```jsx
import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'

// Inside component:
useImperativeHandle(ref, () => ({
  scrollToCard: (card) => {
    setCurrentPage(card.pageNum)
    // After page renders, scroll container to card.rect.y
    setTimeout(() => {
      containerRef.current?.scrollTo({ top: card.rect.y - 100, behavior: 'smooth' })
    }, 100)
  }
}))
```

**Step 3: Run app and verify end-to-end**

```bash
npm run dev
```

Manual test checklist:
- [ ] App opens, "打开 PDF" button visible in toolbar
- [ ] Select PDF → PDF renders in left pane
- [ ] Text selection mode: drag to select text → "讲解" button appears
- [ ] Click "讲解" → card appears in sidebar, streams Chinese text
- [ ] Region mode: switch to ⬚, drag box → "讲解" button appears
- [ ] Click "讲解" with region → card appears (multimodal image analysis)
- [ ] Hover sidebar card → yellow PDF rect highlights blue + pulses
- [ ] Hover PDF rect → sidebar card shakes with blue ring
- [ ] Click sidebar card → PDF scrolls to that page
- [ ] Click "翻译" on a card → translation appears below
- [ ] "+" 笔记 → note saves and persists
- [ ] Close and reopen app → cards still appear for same PDF

**Step 4: Commit**

```bash
git add src/renderer/src/App.jsx
git commit -m "feat: wire App layout with PDF viewer, sidebar, and toolbar"
```

---

## Task 13: claude-code-router Auto-Start

**Files:**
- Modify: `src/main/index.js`

**Step 1: Add router auto-start logic**

In `src/main/index.js`, before `startServer`:
```js
import { spawn } from 'child_process'
import net from 'net'

async function isPortOpen(port) {
  return new Promise(resolve => {
    const s = net.createConnection(port, '127.0.0.1')
    s.on('connect', () => { s.destroy(); resolve(true) })
    s.on('error', () => resolve(false))
  })
}

let routerProcess = null

async function ensureRouter() {
  const running = await isPortOpen(3000)
  if (running) return

  routerProcess = spawn('claude-code-router', [], {
    stdio: 'pipe',
    shell: true,
    detached: false,
  })
  routerProcess.on('error', (e) => console.warn('[router] failed to start:', e.message))

  // Wait up to 5 seconds for router to be ready
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 500))
    if (await isPortOpen(3000)) break
  }
}
```

In `app.whenReady()`:
```js
app.whenReady().then(async () => {
  await ensureRouter()
  const { cardsDB, progressDB } = await initDB(DATA_DIR)
  server = startServer(cardsDB, progressDB)
  createWindow()
})

app.on('before-quit', () => {
  server?.close()
  routerProcess?.kill()
})
```

**Step 2: Commit**

```bash
git add src/main/index.js
git commit -m "feat: auto-start claude-code-router if not already running"
```

---

## Task 14: Build & Package

**Step 1: Verify production build**

```bash
npm run build
```
Expected: `dist/` folder generated with no errors.

**Step 2: Package as .app**

```bash
npm run package   # or: npx electron-builder --mac
```

Expected: `dist/mac/aireader.app` or similar.

**Step 3: Final commit**

```bash
git add .
git commit -m "feat: production build and packaging configuration"
```

---

## Quick Reference

| Command | Purpose |
|---|---|
| `npm run dev` | Start in development mode |
| `npm test` | Run unit tests |
| `npm run build` | Build renderer |
| `npm run package` | Package as desktop app |

**claude-code-router must be installed globally:**
```bash
npm install -g claude-code-router
```
And configured with your Claude Pro session before running the app.
