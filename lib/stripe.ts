import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

/**
 * Crée une autorisation de paiement (fonds bloqués, NON prélevés).
 * On capture seulement quand le DJ accepte, on annule s'il refuse → aucune
 * perte de frais sur les demandes refusées.
 */
export async function createAuthorization(amountCents: number, description: string, metadata: Record<string, string>) {
  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'eur',
    capture_method: 'manual', // autorisation seule
    description,
    metadata,
    automatic_payment_methods: { enabled: true },
  })
}

/** Encaisse réellement une autorisation (le DJ a accepté). */
export async function capturePayment(paymentIntentId: string) {
  return stripe.paymentIntents.capture(paymentIntentId)
}

/** Annule une autorisation non capturée (le DJ a refusé) — 0 € de frais. */
export async function cancelPayment(paymentIntentId: string) {
  return stripe.paymentIntents.cancel(paymentIntentId)
}

/** Récupère un PaymentIntent (pour vérifier son statut côté serveur). */
export async function getPaymentIntent(paymentIntentId: string) {
  return stripe.paymentIntents.retrieve(paymentIntentId)
}
