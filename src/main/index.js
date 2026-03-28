import { app, shell, BrowserWindow, ipcMain, dialog, protocol } from 'electron'
import { createHash, randomBytes } from 'crypto'
import { join } from 'path'
import { tmpdir } from 'os'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDB } from './db/index.js'
import { startServer } from './server/index.js'
import { spawn } from 'child_process'
import net from 'net'

// Register custom protocol before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'localfile', privileges: { secure: true, standard: true, supportFetchAPI: true } }
])

const DATA_DIR = join(app.getPath('userData'), 'data')
let expressServer
let routerProcess = null

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection(port, '127.0.0.1')
    socket.on('connect', () => { socket.destroy(); resolve(true) })
    socket.on('error', () => resolve(false))
    socket.setTimeout(500, () => { socket.destroy(); resolve(false) })
  })
}

async function ensureRouter() {
  const running = await isPortOpen(3000)
  if (running) {
    console.log('[router] already running on :3000')
    return
  }

  console.log('[router] starting claude-code-router...')
  routerProcess = spawn('claude-code-router', [], {
    stdio: 'pipe',
    shell: true,
    detached: false,
  })

  routerProcess.stdout?.on('data', (d) => console.log('[router]', d.toString().trim()))
  routerProcess.stderr?.on('data', (d) => console.warn('[router]', d.toString().trim()))
  routerProcess.on('error', (e) => console.warn('[router] spawn error:', e.message))

  // Wait up to 6 seconds for router to become ready
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 500))
    if (await isPortOpen(3000)) {
      console.log('[router] ready on :3000')
      return
    }
  }
  console.warn('[router] did not start in time — AI features may not work')
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  await ensureRouter()

  // Initialize DB and start Express server
  const { cardsDB, progressDB } = await initDB(DATA_DIR)
  expressServer = startServer(cardsDB, progressDB)

  // Serve local files via localfile:// protocol
  protocol.handle('localfile', async (request) => {
    try {
      const filePath = decodeURIComponent(new URL(request.url).pathname)
      const data = await fs.promises.readFile(filePath)
      return new Response(data, { headers: { 'content-type': 'application/pdf' } })
    } catch (e) {
      return new Response('Not found', { status: 404 })
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// IPC handlers
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    properties: ['openFile']
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('hash-file', async (_, filePath) => {
  const buf = await fs.promises.readFile(filePath)
  return createHash('sha256').update(buf).digest('hex')
})

ipcMain.handle('save-temp-image', async (_, base64Data) => {
  const id = randomBytes(8).toString('hex')
  const filePath = join(tmpdir(), `aireader_${id}.png`)
  await fs.promises.writeFile(filePath, Buffer.from(base64Data, 'base64'))
  return filePath
})

ipcMain.handle('delete-temp-image', async (_, filePath) => {
  try { await fs.promises.unlink(filePath) } catch {}
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  expressServer?.close()
  if (routerProcess) {
    routerProcess.kill()
    routerProcess = null
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
