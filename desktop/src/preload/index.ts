import { contextBridge, ipcRenderer } from 'electron'
import type { ProlinkStatus } from '../main/prolink'

export interface AuthTokens { access_token: string; refresh_token: string }

// API sûre exposée au renderer (window.tipson)
const api = {
  toggleFullscreen: (): Promise<boolean> => ipcRenderer.invoke('toggle-fullscreen'),
  isFullscreen: (): Promise<boolean> => ipcRenderer.invoke('is-fullscreen'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),
  googleLogin: (apiBase: string): Promise<void> => ipcRenderer.invoke('google-login', apiBase),
  // Auth : tokens renvoyés par tipson.online via le deep-link tipson://
  onAuthTokens: (cb: (t: AuthTokens) => void) => {
    const listener = (_e: unknown, t: AuthTokens) => cb(t)
    ipcRenderer.on('auth:tokens', listener)
    return () => ipcRenderer.removeListener('auth:tokens', listener)
  },
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
