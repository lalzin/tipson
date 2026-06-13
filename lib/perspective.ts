/**
 * Analyse de toxicité via l'API Perspective de Google.
 * Renvoie un score 0..1 (1 = très toxique), ou null si l'API est indisponible
 * (pas de clé, erreur réseau) → l'appelant peut alors retomber sur le dictionnaire.
 *
 * PLACEHOLDER : définir PERSPECTIVE_API_KEY (clé API Google Cloud, API
 * "Perspective Comment Analyzer" activée).
 */
export async function getToxicity(text: string): Promise<number | null> {
  const key = process.env.PERSPECTIVE_API_KEY
  if (!key) return null

  try {
    const res = await fetch(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: { text },
          languages: ['fr'],
          requestedAttributes: { TOXICITY: {} },
          doNotStore: true,
        }),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const score = data?.attributeScores?.TOXICITY?.summaryScore?.value
    return typeof score === 'number' ? score : null
  } catch {
    return null
  }
}

/** Message à montrer à l'utilisateur selon le score de toxicité (0..1). */
export function toxicityMessage(score: number): string {
  if (score >= 0.9) return 'Message bloqué : propos jugés très toxiques. 🙏'
  if (score >= 0.75) return 'Message non publié : restons bienveillants. 🙂'
  return 'Message non publié : merci de rester respectueux. 🙂'
}
