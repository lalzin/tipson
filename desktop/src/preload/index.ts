import { contextBridge, ipcRenderer } from 'electron'
import type { ProlinkStatus } from '../main/prolink'

// API sûre exposée au renderer (window.tipson)
const api = {
  toggleFullscreen: (): Promise<boolean> => ipcRenderer.invoke('toggle-fullscreen'),
  isFullscreen: (): Promise<boolean> => ipcRenderer.invoke('is-fullscreen'),
  prolinkStart: (): Promise<{ ok: boolean; reason?: string }> => ipcRenderer.invoke('prolink-start'),
  prolinkStop: (): Promise<void> => ipcRenderer.invoke('prolink-stop'),
  onProlinkStatus: (cb: (s: ProlinkStatus) => void) => {
    const listener = (_e: unknown, s: ProlinkStatus) => cb(s)
    ipcRenderer.on('prolink:status', listener)
    return () => ipcRenderer.removeListener('prolink:status', listener)
  },
}

contextBridge.exposeInMainWorld('tipson', api)

export type TipsonApi = typeof api
