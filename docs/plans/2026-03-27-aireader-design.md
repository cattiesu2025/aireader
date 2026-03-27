# AIReader — 设计文档

**日期：** 2026-03-27
**状态：** 已批准，待实现

---

## 1. 产品概述

个人专用 PDF 课件学习工具。双栏界面：左侧交互式 PDF 阅读器，右侧 AI 讲解侧边栏。AI 讲解按需触发（严禁自动生成），支持文字选区和框选图片两种模式，讲解内容默认输出中文，支持流式显示。

---

## 2. 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Electron + electron-vite |
| 前端 | React + Tailwind CSS |
| 状态管理 | Zustand |
| PDF 渲染 | react-pdf（pdf.js） |
| 本地存储 | LowDB v3（JSON 文件） |
| 后端服务 | Express（内嵌 Electron Main 进程，自动启动） |
| AI 代理 | claude-code-router（OpenAI 兼容格式，:3000） |
| 流式传输 | Server-Sent Events (SSE) |

---

## 3. 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    Electron App                          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Renderer Process (React)             │   │
│  │                                                   │   │
│  │   ┌─────────────────┐  ┌─────────────────────┐   │   │
│  │   │  PDF Viewer      │  │   AI Sidebar         │   │   │
│  │   │  (react-pdf)     │  │   (ExplainCard list) │   │   │
│  │   │                  │  │                      │   │   │
│  │   │  Text Layer      │  │  ● 流式文字渲染       │   │   │
│  │   │  Canvas Overlay  │  │  ● Hover 联动高亮    │   │   │
│  │   │  [讲解] 按钮     │  │  ● 点击跳转 PDF 页   │   │   │
│  │   └────────┬─────────┘  └──────────┬──────────┘   │   │
│  │            │   Zustand Store        │              │   │
│  │            └───────────┬────────────┘              │   │
│  │                        │ fetch + SSE               │   │
│  └────────────────────────┼──────────────────────────┘   │
│                           │ http://localhost:3799         │
│  ┌────────────────────────┼──────────────────────────┐   │
│  │     Main Process       │                           │   │
│  │                        ▼                           │   │
│  │   ┌─────────────────────────────────────────┐     │   │
│  │   │         Express Server (:3799)           │     │   │
│  │   │                                         │     │   │
│  │   │  POST /api/explain  → SSE stream         │     │   │
│  │   │  POST /api/translate → SSE stream        │     │   │
│  │   │  GET  /api/cards    → LowDB query        │     │   │
│  │   │  POST /api/cards    → LowDB write        │     │   │
│  │   │  GET  /api/progress → LowDB query        │     │   │
│  │   │  PUT  /api/progress → LowDB write        │     │   │
│  │   └────────────┬────────────────────────────┘     │   │
│  │                │                                   │   │
│  │       ┌────────┴──────────┐                        │   │
│  │       ▼                   ▼                        │   │
│  │  ┌─────────────┐   ┌────────────────────────┐     │   │
│  │  │   LowDB     │   │  child_process.spawn   │     │   │
│  │  │  (JSON 文件) │   │  claude-code-router    │     │   │
│  │  │             │   │  (:3000, OpenAI format) │     │   │
│  │  │  cards.json │   └────────────┬───────────┘     │   │
│  │  │  progress.json              │                  │   │
│  │  └─────────────┘               ▼                  │   │
│  │                         claude CLI                 │   │
│  │                         (Pro 订阅)                 │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**关键数据流（用户点击「讲解」）：**

1. 用户在 PDF 选中文字 / Shift+拖拽框选区域 → 点击浮动「讲解」按钮
2. Renderer 发 `POST /api/explain`，携带 `{ text, imageBase64?, pdfHash, pageNum, rect }`
3. Express 向 claude-code-router（`:3000`）发 OpenAI 格式请求，开启 stream
4. Express 通过 SSE 把 token 逐字推给 Renderer
5. Renderer 实时渲染到右侧侧边栏，完成后写入 LowDB

---

## 4. 项目目录结构

```
aireader/
├── package.json
├── electron.vite.config.js
│
├── src/
│   ├── main/
│   │   ├── index.js                # Electron 入口，启动窗口 + server
│   │   ├── server/
│   │   │   ├── index.js            # Express app，注册路由
│   │   │   ├── routes/
│   │   │   │   ├── explain.js      # POST /api/explain → SSE
│   │   │   │   ├── translate.js    # POST /api/translate → SSE
│   │   │   │   ├── cards.js        # GET/POST /api/cards
│   │   │   │   └── progress.js     # GET/PUT /api/progress
│   │   │   └── claude.js           # claude-code-router 调用封装
│   │   └── db/
│   │       ├── index.js            # LowDB 初始化
│   │       ├── cards.js            # 讲解卡片 CRUD
│   │       └── progress.js         # 阅读进度 CRUD
│   │
│   ├── preload/
│   │   └── index.js                # contextBridge
│   │
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.jsx
│           ├── App.jsx
│           ├── store/
│           │   └── useStore.js     # Zustand store
│           ├── components/
│           │   ├── PDFViewer/
│           │   │   ├── index.jsx
│           │   │   ├── SelectionOverlay.jsx
│           │   │   └── ExplainButton.jsx
│           │   ├── Sidebar/
│           │   │   ├── index.jsx
│           │   │   ├── ExplainCard.jsx
│           │   │   └── TranslateButton.jsx
│           │   └── Toolbar/
│           │       └── index.jsx
│           ├── hooks/
│           │   ├── usePDFSelection.js
│           │   ├── useExplain.js
│           │   ├── useTranslate.js
│           │   └── useHoverSync.js
│           └── lib/
│               ├── pdfHash.js
│               └── captureRegion.js
│
├── data/                           # 运行时数据（gitignore）
│   ├── cards.json
│   └── progress.json
│
└── resources/
    └── icons/
```

---

## 5. 核心状态（Zustand Store）

```js
{
  // PDF 状态
  pdfHash: string,
  currentPage: number,
  totalPages: number,
  scrollPosition: number,

  // 选区状态
  selection: {
    type: 'text' | 'region' | null,
    text: string,
    imageBase64: string | null,
    rect: { x, y, width, height },
    pageNum: number,
  },

  // 讲解卡片列表
  cards: [{
    id: string,
    pdfHash: string,
    pageNum: number,
    rect: { x, y, width, height },
    sourceText: string,
    content: string,
    translation: string | null,
    note: string,
    createdAt: number,
  }],

  // Hover 联动状态
  hoveredCardId: string | null,
  hoveredRectId: string | null,
}
```

---

## 6. 双向 Hover 联动逻辑

- 鼠标悬停侧边栏卡片 → `setHoveredCardId(card.id)` → PDF Canvas Overlay 对应 rect 绘制蓝色闪烁边框
- 鼠标悬停 PDF 高亮区域 → `setHoveredRectId(card.id)` → 对应侧边栏卡片触发 `animate-shake` + `ring-2 ring-blue-400`
- 点击侧边栏卡片 → `scrollToPosition({ page: card.pageNum, y: card.rect.y })`

---

## 7. 框选截图技术路径

1. 默认模式：文字选区（浏览器原生）
2. Shift + 拖拽 / Toolbar 区域模式按钮：切换为框选模式，Canvas Overlay 接管鼠标事件
3. 松开鼠标 → `captureRegion(pdfCanvas, rect, scale)` → `OffscreenCanvas.drawImage` → `toBlob` → base64
4. 发送给 AI 时使用 OpenAI multimodal 格式：`content: [{ type: "image_url", ... }, { type: "text", ... }]`

---

## 8. AI Prompt 配置

```js
// System prompt（所有路由复用）
const SYSTEM_PROMPT = `你是一位专业的学习辅导助手。
请始终用中文回答，语言简洁清晰，适合学习理解。`

// 翻译 prompt
`请将以下内容翻译成中文，保持学术准确性：\n\n${text}`
```

---

## 9. PDF 匹配机制

每次打开 PDF 文件时，计算文件内容的 SHA-256 hash 作为唯一标识（`pdfHash`）。LowDB 中所有卡片和进度记录均以 `pdfHash` 为索引，确保同一文件无论路径是否变化，历史讲解均能自动加载。

---

## 10. claude-code-router 启动策略

Electron Main 进程启动时，通过 `child_process.spawn` 拉起 claude-code-router（如未运行），Express server 随应用自动启动，用户无感知。应用退出时统一关闭所有子进程。
