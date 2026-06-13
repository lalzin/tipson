/**
 * Analyse de toxicité via l'API Perspective de Google.
 * Renvoie un score 0..1 (1 = très toxique), ou null si l'API est indisponible
 * (pas de clé, erreur réseau) → l'appelant peut alors retomber sur le dictionnaire.
 *
 * PLACEHOLDER : définir PERSPECTIVE_API_KEY (clé API Google Cloud, API
 * "Perspective Comment Analyzer" activée).
 */
async function callPerspective(text: string, attributes: Record<string, object>): Promise<number | null> {
  const key = process.env.PERSPECTIVE_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: { text }, languages: ['fr'], requestedAttributes: attributes, doNotStore: true }),
      }
    )
    if (!res.ok) return res.status // code d'erreur pour décider d'un repli
    const data = await res.json()
    const scores = Object.keys(attributes)
      .map(a => data?.attributeScores?.[a]?.summaryScore?.value)
      .filter((v): v is number => typeof v === 'number')
    return scores.length ? Math.max(...scores) : null
  } catch {
    return null
  }
}

/**
 * Score de toxicité 0..1 = max(TOXICITY, INSULT, PROFANITY).
 * Si ces attributs ne sont pas supportés (erreur 400), repli sur TOXICITY seul.
 * null = API indisponible → l'appelant utilise le dictionnaire en repli.
 */
export async function getToxicity(text: string): Promise<number | null> {
  if (!process.env.PERSPECTIVE_API_KEY) return null
  const full = await callPerspective(text, { TOXICITY: {}, INSULT: {}, PROFANITY: {} })
  if (typeof full === 'number' && full >= 0 && full <= 1) return full
  // full vaut un code HTTP (ex. 400 si un attribut n'est pas dispo en FR) → repli TOXICITY
  const tox = await callPerspective(text, { TOXICITY: {} })
  return typeof tox === 'number' && tox >= 0 && tox <= 1 ? tox : null
}

/** Message à montrer à l'utilisateur selon le score de toxicité (0..1). */
export function toxicityMessage(score: number): string {
  if (score >= 0.9) return 'Message bloqué : propos jugés très toxiques. 🙏'
  if (score >= 0.75) return 'Message non publié : restons bienveillants. 🙂'
  return 'Message non publié : merci de rester respectueux. 🙂'
}
