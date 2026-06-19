import { app, BrowserWindow, ipcMain, shell, globalShortcut } from 'electron'
import { join } from 'path'

// ── Pro DJ Link (Phase 3) — branché plus tard sur prolink-connect.
// Le process principal a l'accès réseau UDP nécessaire pour lire la platine
// (BPM, phase de beat, morceau en cours) et le pousse au renderer via IPC.
import { startProlink, stopProlink } from './prolink'

let win: BrowserWindow | null = null

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

  // Raccourcis : F11 plein écran, Cmd/Ctrl+Q quitter
  globalShortcut.register('F11', () => win?.setFullScreen(!win.isFullScreen()))

  // IPC : plein écran
  ipcMain.handle('toggle-fullscreen', () => {
    const fs = !win?.isFullScreen()
    win?.setFullScreen(fs)
    return fs
  })
  ipcMain.handle('is-fullscreen', () => !!win?.isFullScreen())

  // IPC : link platine (Phase 3) — émet des évènements 'prolink:status' au renderer
  ipcMain.handle('prolink-start', () => startProlink(payload => win?.webContents.send('prolink:status', payload)))
  ipcMain.handle('prolink-stop', () => stopProlink())

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('will-quit', () => { globalShortcut.unregisterAll(); stopProlink() })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
