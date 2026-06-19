import { API_BASE } from './config'

export interface StudioSession {
  id: string
  name: string
  code: string
  status: string
  venue?: string | null
  profiles?: { dj_name: string }
  display_color1?: string | null
  display_color2?: string | null
  display_show_dj?: boolean
  display_show_venue?: boolean
  display_show_name?: boolean
}

// Résout un code de soirée via l'API publique de tipson.online, puis charge
// les infos publiques de la session (mêmes endpoints que l'écran web).
export async function resolveSessionByCode(code: string): Promise<StudioSession> {
  const c = code.trim().toUpperCase()
  const byCode = await fetch(`${API_BASE}/api/session-by-code?code=${encodeURIComponent(c)}`)
  if (!byCode.ok) throw new Error('Code de soirée invalide.')
  const data = await byCode.json()
  const id = data.id || data.session?.id
  if (!id) throw new Error('Soirée introuvable.')

  const pub = await fetch(`${API_BASE}/api/sessions/public/${id}`, { cache: 'no-store' })
  const full = pub.ok ? await pub.json() : data
  return { ...data, ...full, id }
}
