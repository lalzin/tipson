import { app, BrowserWindow, ipcMain, shell, globalShortcut } from 'electron'
import { join } from 'path'

// ── Pro DJ Link (Phase 3) — branché plus tard sur prolink-connect.
import { startProlink, stopProlink } from './prolink'

let win: BrowserWindow | null = null

// ── Deep-link tipson:// (retour d'authentification depuis tipson.online) ───────
// Une instance unique : un 2e lancement (via le lien tipson://) transmet l'URL
// à l'instance en cours.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('tipson', process.execPath, [join(__dirname, '../..')])
  } else {
    app.setAsDefaultProtocolClient('tipson')
  }

  // Windows / Linux : le lien arrive en argv au 2e lancement
  app.on('second-instance', (_e, argv) => {
    const url = argv.find(a => a.startsWith('tipson://'))
    if (url) handleDeepLink(url)
    if (win) { if (win.isMinimized()) win.restore(); win.focus() }
  })
  // macOS : évènement open-url
  app.on('open-url', (_e, url) => handleDeepLink(url))
}

function handleDeepLink(url: string) {
  try {
    // tipson://auth#access_token=...&refresh_token=...
    const hash = url.split('#')[1] || ''
    const params = new URLSearchParams(hash)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    if (access_token && refresh_token) {
      win?.webContents.send('auth:tokens', { access_token, refresh_token })
      if (win) { if (win.isMinimized()) win.restore(); win.focus() }
    }
  } catch { /* ignore */ }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#06060b',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  win.on('ready-to-show', () => win?.show())

  // Liens externes (OAuth Google, docs) → navigateur système
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  globalShortcut.register('F11', () => win?.setFullScreen(!win.isFullScreen()))

  ipcMain.handle('toggle-fullscreen', () => {
    const fs = !win?.isFullScreen()
    win?.setFullScreen(fs)
    return fs
  })
  ipcMain.handle('is-fullscreen', () => !!win?.isFullScreen())

  // Ouvre la page d'auth web (tipson.online) dans le navigateur système
  ipcMain.handle('open-external', (_e, url: string) => shell.openExternal(url))

  // IPC : link platine (Phase 3)
  ipcMain.handle('prolink-start', () => startProlink(payload => win?.webContents.send('prolink:status', payload)))
  ipcMain.handle('prolink-stop', () => stopProlink())

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('will-quit', () => { globalShortcut.unregisterAll(); stopProlink() })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
