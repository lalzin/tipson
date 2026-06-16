// Identifiant d'appareil persistant (anti-spam, limite de demandes, bannissement
// par appareil — même pour les invités). Stocké en localStorage.
const KEY = 'tipson-cid'

/** Retourne l'identifiant d'appareil, en le générant et le persistant si besoin. */
export function getClientId(): string {
  if (typeof localStorage === 'undefined') return ''
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
    localStorage.setItem(KEY, id)
  }
  return id
}
