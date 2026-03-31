# AIReader

A desktop PDF study tool powered by Claude AI. Read PDFs side-by-side with AI-generated explanations, translations, and highlights — all stored locally.

![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![Electron](https://img.shields.io/badge/electron-39-blue)
![React](https://img.shields.io/badge/react-19-blue)

---

## Features

### PDF Reading
- Open any local PDF file
- Zoom from 50% to 300% with live percentage display
- Navigate by previous/next buttons or type a page number directly
- Reading progress is saved automatically — reopen a PDF and it returns to where you left off

### AI Selection Modes

**Text mode (default)** — select any text on the page and click **Explain** or **Translate** to generate an AI card.

**Region mode** — click the ⬚ button (or hold Shift) to switch to drag-select mode. Draw a rectangle over any area — a diagram, formula, figure, or chart — and Claude will explain the image content.

**Explain this page** — one-click button at the bottom of the PDF to explain the entire current page as an image.

### AI Cards Sidebar
- Explanations appear as cards in the right sidebar, sorted by page number then creation time
- Cards support full **Markdown** rendering including tables, code blocks, and **LaTeX math** (via KaTeX)
- Each card shows the source text, the explanation, and an optional translation
- Delete individual cards or just their translations
- Hover over a card to highlight the corresponding region on the PDF; click the PDF highlight to scroll to the card

### Highlights
- Selected regions are highlighted on the PDF with a yellow overlay
- Highlights are scale-aware: they stay correctly positioned when you zoom in or out

---

## Prerequisites

- **macOS** (built and tested on macOS)
- [Claude Code CLI](https://github.com/anthropics/claude-code) installed at `~/.local/bin/claude` and authenticated

The app calls `claude --print` as a subprocess. Make sure `claude` works in your terminal before launching AIReader.

---

## Development

```bash
npm install
npm run dev
```

### Build

```bash
npm run build:mac
```

The `.dmg` installer is output to the `dist/` folder.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 39 |
| UI | React 19, Tailwind CSS v4 |
| PDF rendering | react-pdf (pdf.js) |
| AI | Claude Code CLI (`claude --print`) |
| Markdown / LaTeX | react-markdown, remark-gfm, remark-math, rehype-katex |
| State | Zustand |
| Persistence | LowDB (JSON), Express embedded server |
| Build | electron-vite, electron-builder |

---

## Project Structure

```
src/
  main/           # Electron main process + embedded Express server
    server/       # API routes (explain, translate, cards, progress)
    claude.js     # Claude CLI subprocess helpers
  renderer/       # React frontend
    components/
      PDFViewer/  # PDF display, selection overlays, explain button
      Sidebar/    # AI cards list
      Toolbar/    # Navigation, zoom, mode toggle
    hooks/        # usePDFSelection, useExplain, useHoverSync
    store/        # Zustand store
  preload/        # Electron context bridge
```

---

## License

MIT
