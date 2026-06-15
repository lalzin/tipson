/**
 * Modération de messages (couche dictionnaire, toujours active, coût CPU ~nul).
 * Conçue pour une RECALL élevée (bloquer la grande majorité des messages
 * haineux/vulgaires FR+EN) en complément de l'API Perspective (couche ML).
 *
 * Stratégie :
 *  1) normalisation agressive (minuscules, accents, leet, anti-obfuscation espacée)
 *  2) mots exacts pour les termes ambigus en sous-chaîne (con, pd…)
 *  3) sous-chaînes pour les termes longs sans ambiguïté (connard, enculer…)
 *  4) phrases multi-mots (fils de pute, ta gueule, je te baise…)
 *  5) combinaisons « préfixe insultant + cible » (sale gay, grosse merde, espèce de con…)
 */

// ── Termes bannis en SOUS-CHAÎNE (longs, peu d'ambiguïté) ────────────────────
const BANNED_SUBSTRINGS = [
  // vulgarité / insultes FR
  'connard', 'connasse', 'conard', 'encule', 'enculer', 'enculee', 'salope', 'salaud',
  'salopard', 'putain', 'pouffiasse', 'poufiasse', 'batard', 'batarde', 'abruti',
  'debile', 'cretin', 'ducon', 'tocard', 'raclure', 'ordure',
  'glandu', 'tafiole', 'tapette', 'tarlouze', 'tarlouse', 'gouine', 'pedale',
  'bougnoule', 'negro', 'bamboula', 'youpin', 'chinetoque',
  'mongol', 'mongolien', 'trisomique', 'attarde',
  'chiotte', 'chierie', 'emmerde', 'emmerdeur', 'enfoire', 'enfoiree', 'branleur',
  // verlan / argot insultant
  'boloss', 'bolosse', 'bouffon', 'bouffonne', 'cassos',
  'degueulasse', 'gueulasse',
  // EN
  'fuck', 'motherfuck', 'shit', 'bitch', 'asshole', 'cunt', 'nigger', 'nigga',
  'faggot', 'whore', 'bastard', 'retard', 'dickhead', 'cocksucker',
  'kill yourself', 'raping',
]

// ── Mots EXACTS (token) — ambigus en sous-chaîne ─────────────────────────────
const BANNED_WORDS = [
  'con', 'cons', 'conne', 'pd', 'ped', 'pede', 'tg', 'ntm', 'fdp', 'kys',
  'pute', 'putes', 'feuj', 'renoi', 'negre', 'negres', 'bicot', 'gogol',
  'nique', 'niquer', 'niquee', 'bite', 'bites', 'merde', 'merdes',
  'naze', 'nase', 'guez', 'dep', 'pue', 'pd', 'rape', 'sucemoi',
]

// ── Phrases multi-mots (matchées sur la version compactée, sans espaces) ─────
const BANNED_PHRASES = [
  'filsdepute', 'fildepute', 'tamere', 'tagueule', 'fermetagueule', 'fermela',
  'niquetamere', 'niquetarace', 'niquetonpere', 'vatefaire', 'vatefairefoutre',
  'vatefaireenculer', 'jetebaise', 'tebaise', 'tebaiser', 'mebaise',
  'labaise', 'teken', 'jeteken', 'tencule', 'jetencule', 'grossepute', 'grossepd',
  'salepute', 'salepd', 'salegay', 'salegouine', 'salenegre', 'salejuif',
  'salearabe', 'salerace', 'salechienne', 'salemerde', 'saleconnard', 'saleconne',
  'crevelaraclure', 'jevaisteniquer', 'teniquer', 'sucema', 'mortauxchiens',
]

// ── Combinaisons « préfixe insultant + cible » ──────────────────────────────
const INSULT_PREFIXES = ['sale', 'sales', 'grosse', 'gros', 'gras', 'sacre', 'sacree', 'sombre', 'espece', 'putain']
const INSULT_TARGETS = new Set([
  'gay', 'gae', 'gays', 'pd', 'pede', 'gouine', 'tafiole', 'tapette', 'trav', 'travelo',
  'juif', 'juive', 'noir', 'noire', 'arabe', 'race', 'negre', 'bougnoule', 'chinois', 'rebeu', 'feuj',
  'merde', 'con', 'conne', 'connard', 'pute', 'putain', 'chienne', 'chien', 'porc', 'rat', 'tepu',
  'mongol', 'gogol', 'debile', 'attarde', 'naze', 'bouffon', 'bolos', 'cassos', 'looser', 'loser',
])

const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '€': 'e',
}

export function normalize(input: string): string {
  let s = (input || '').toLowerCase()
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '')  // accents
  s = s.replace(/[013457 8@$€]/g, c => LEET[c] ?? c)       // leet (l'espace reste neutre)
  s = s.replace(/[^a-z0-9\s]/g, ' ')                        // ponctuation → espace
  s = s.replace(/(.)\1{2,}/g, '$1$1')                       // puuute → puute
  return s.replace(/\s+/g, ' ').trim()
}

export interface ModerationResult { ok: boolean; reason?: string }

const REASON = 'Message non conforme. Restons bienveillants 🙂'

/**
 * Écran dictionnaire complet (toujours actif). ok:false dès qu'un signal
 * haineux/vulgaire est détecté.
 */
// Faux amis : mots innocents contenant une racine bannie (salopette/salope…).
const FALSE_FRIENDS = new Set(['salopette', 'salopettes'])

export function dictionaryScreen(text: string): ModerationResult {
  const norm = normalize(text)
  if (!norm) return { ok: true }
  const words = norm.split(' ').filter(Boolean).filter(w => !FALSE_FRIENDS.has(w))
  const wordSet = new Set(words)
  const compact = words.join('') // anti-obfuscation « c o n n a r d », sans faux amis

  // 1) mots exacts
  for (const w of BANNED_WORDS) if (wordSet.has(w)) return { ok: false, reason: REASON }

  // 2) sous-chaînes (sur le compact)
  for (const sub of BANNED_SUBSTRINGS) {
    const r = sub.replace(/\s/g, '')
    if (r && compact.includes(r)) return { ok: false, reason: REASON }
  }

  // 3) phrases multi-mots
  for (const p of BANNED_PHRASES) if (compact.includes(p.replace(/\s/g, ''))) return { ok: false, reason: REASON }

  // 4) combinaisons préfixe + cible (sale gay, grosse merde, espèce de con…)
  for (let i = 0; i < words.length; i++) {
    if (!INSULT_PREFIXES.includes(words[i])) continue
    let j = i + 1
    if (words[j] === 'de' || words[j] === 'd') j++ // espèce de con
    if (words[j] && INSULT_TARGETS.has(words[j])) return { ok: false, reason: REASON }
  }

  return { ok: true }
}

// Compat : « liste critique » et modération complète passent par le même écran.
export function criticalBlock(text: string): ModerationResult {
  return dictionaryScreen(text)
}

export function moderateMessage(text: string): ModerationResult {
  const raw = (text || '').trim()
  if (raw.length === 0) return { ok: false, reason: 'Message vide' }
  if (raw.length > 140) return { ok: false, reason: 'Message trop long (140 caractères max)' }
  if (/(https?:\/\/|www\.)/i.test(raw)) return { ok: false, reason: 'Les liens ne sont pas autorisés' }
  return dictionaryScreen(raw)
}
