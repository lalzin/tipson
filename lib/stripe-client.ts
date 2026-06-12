import Stripe from 'stripe'

/**
 * Client Stripe partagé pour TOUTES les requêtes Stripe de la démo Connect (API V2).
 *
 * On NE fixe PAS la version d'API : le SDK utilise automatiquement la version
 * courante (ici 2026-05-27.dahlia), comme recommandé pour l'API V2.
 *
 * PLACEHOLDER — la clé secrète Stripe doit être fournie via l'environnement :
 *   STRIPE_SECRET_KEY = sk_test_...  (test)  ou  sk_live_...  (production)
 * Définissez-la dans `.env.local` en local et dans les variables Vercel en prod.
 */
function createStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) {
    throw new Error(
      "Configuration Stripe manquante : la variable d'environnement STRIPE_SECRET_KEY n'est pas définie. " +
      'Ajoutez votre clé secrète Stripe (sk_test_… ou sk_live_…) dans .env.local et sur Vercel, puis redéployez.'
    )
  }
  return new Stripe(apiKey)
}

export const stripeClient = createStripeClient()

// Commission de la plateforme prélevée sur chaque vente (en %).
export const APPLICATION_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 10)

/** Montant de la commission plateforme (en centimes) pour un montant donné. */
export function applicationFeeAmount(amountCents: number): number {
  return Math.round(amountCents * (APPLICATION_FEE_PERCENT / 100))
}
