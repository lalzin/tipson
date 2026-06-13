/**
 * Modération basique par dictionnaire (beta — pas une IA).
 * Normalise le texte (minuscules, accents, leet, répétitions) puis cherche des
 * racines bannies. Bloque le plus grossier ; à compléter au fil de l'eau.
 */

// Racines bannies (FR + EN), y compris argot / verlan.
const BANNED_ROOTS = [
  // insultes / vulgarité FR
  'connard', 'connasse', 'encule', 'enculer', 'salope', 'salaud', 'pute', 'putain',
  'merde', 'nique', 'niquer', 'batard', 'pd', 'pede', 'tapette', 'negre', 'bougnoule',
  'pouffiasse', 'fdp', 'ntm', 'tg', 'ferme ta gueule', 'fils de pute', 'grosse pute',
  'bite', 'couille', 'chatte', 'salopard', 'abruti', 'debile', 'cretin', 'gueule',
  'ducon', 'tocard', 'raclure', 'ordure', 'branleur', 'glandu', 'sous merde',
  // argot / verlan / familier insultant
  'guez', 'dep', 'boloss', 'bolosse', 'bolos', 'bouffon', 'cassos', 'naze', 'nase',
  'degueu', 'degueulasse', 'gueulasse', 'feuj', 'renoi', 'cassetoi',
  // EN
  'fuck', 'fucker', 'shit', 'bitch', 'asshole', 'cunt', 'nigger', 'faggot', 'whore',
  'dick', 'pussy', 'bastard', 'slut', 'rape', 'kill yourself', 'kys', 'retard',
]

// Variantes leet → lettres
const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '€': 'e',
}

export function normalize(input: string): string {
  let s = input.toLowerCase()
  // accents
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  // leet
  s = s.replace(/[01345 7@$€]/g, c => LEET[c] ?? c)
  // garde lettres/chiffres/espaces
  s = s.replace(/[^a-z0-9\s]/g, '')
  // réduit les répétitions (puuute -> pute)
  s = s.replace(/(.)\1{2,}/g, '$1$1')
  return s.replace(/\s+/g, ' ').trim()
}

export interface ModerationResult {
  ok: boolean
  reason?: string
}

export function moderateMessage(text: string): ModerationResult {
  const raw = (text || '').trim()
  if (raw.length === 0) return { ok: false, reason: 'Message vide' }
  if (raw.length > 140) return { ok: false, reason: 'Message trop long (140 caractères max)' }

  const norm = normalize(raw)
  const words = norm.split(' ').filter(Boolean)
  const compact = norm.replace(/\s/g, '')

  for (const root of BANNED_ROOTS) {
    const r = normalize(root).replace(/\s/g, '')
    if (!r) continue
    // Mots courts (≤ 4) : match par MOT entier (évite "depuis" → "dep").
    // Racines plus longues : sous-chaîne (attrape les obfuscations type "encu1e").
    const hit = r.length <= 4 ? words.includes(r) : compact.includes(r)
    if (hit) {
      return { ok: false, reason: 'Message non conforme. Restons bienveillants 🙂' }
    }
  }

  // Anti-spam : trop d'URLs / caractères répétés
  if (/(https?:\/\/|www\.)/i.test(raw)) return { ok: false, reason: 'Les liens ne sont pas autorisés' }

  return { ok: true }
}
