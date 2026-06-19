/// <reference types="vite/client" />
import type { TipsonApi } from '../../preload'

declare global {
  interface Window {
    tipson: TipsonApi
  }
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_BASE: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
