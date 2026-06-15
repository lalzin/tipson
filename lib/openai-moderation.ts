/**
 * Modération via l'API OpenAI (« omni-moderation-latest »).
 * Couche ML PRINCIPALE (multilingue, gratuite, calibrée). Renvoie :
 *   - { flagged, score, categories } si l'API répond
 *   - null si indisponible (pas de clé / erreur réseau) → l'appelant retombe
 *     sur Perspective, puis sur le dictionnaire.
 *
 * Définir OPENAI_API_KEY (clé secrète OpenAI) côté serveur (Vercel / .env.local).
 */
export interface ModerationVerdict {
  flagged: boolean        // décision calibrée d'OpenAI
  score: number           // score max parmi les catégories (0..1)
  categories: string[]    // catégories déclenchées (hate, harassment, sexual…)
}

export async function getOpenAIModeration(text: string): Promise<ModerationVerdict | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'omni-moderation-latest', input: text }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const r = data?.results?.[0]
    if (!r) return null

    const scoreValues = r.category_scores
      ? Object.values(r.category_scores).filter((v): v is number => typeof v === 'number')
      : []
    const score = scoreValues.length ? Math.max(...scoreValues) : (r.flagged ? 1 : 0)
    const categories = r.categories
      ? Object.keys(r.categories).filter(k => r.categories[k])
      : []

    return { flagged: !!r.flagged, score, categories }
  } catch {
    return null
  }
}

/** Message affiché à l'utilisateur quand un contenu est refusé. */
export function moderationMessage(score: number): string {
  if (score >= 0.85) return 'Message bloqué : propos jugés très toxiques. 🙏'
  if (score >= 0.6) return 'Message non publié : restons bienveillants. 🙂'
  return 'Message non publié : merci de rester respectueux. 🙂'
}
