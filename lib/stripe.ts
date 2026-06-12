import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

// Commission de la plateforme prélevée sur chaque pourboire (en %).
// Configurable sans redéploiement via la variable d'environnement.
export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 10)

/** Montant de la commission plateforme (en centimes) pour un pourboire donné. */
export function platformFee(amountCents: number): number {
  return Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100))
}

/**
 * Crée une autorisation de paiement (fonds bloqués, NON prélevés).
 * On capture seulement quand le DJ accepte, on annule s'il refuse → aucune
 * perte de frais sur les demandes refusées.
 *
 * Si `destinationAccount` est fourni (DJ avec compte Connect actif), le paiement
 * est routé vers son compte : Stripe lui verse le montant moins la commission
 * plateforme et moins les frais Stripe (qu'il supporte, via on_behalf_of).
 */
export async function createAuthorization(
  amountCents: number,
  description: string,
  metadata: Record<string, string>,
  destinationAccount?: string,
) {
  const base: Stripe.PaymentIntentCreateParams = {
    amount: amountCents,
    currency: 'eur',
    capture_method: 'manual',
    description,
    metadata,
    automatic_payment_methods: { enabled: true },
  }

  if (destinationAccount) {
    base.on_behalf_of = destinationAccount
    base.transfer_data = { destination: destinationAccount }
    base.application_fee_amount = platformFee(amountCents)
  }

  return stripe.paymentIntents.create(base)
}

// ── Stripe Connect (versements aux organisateurs) ───────────────────────────

/** Crée un compte Connect Express pour un organisateur. */
export async function createExpressAccount(email?: string) {
  return stripe.accounts.create({
    type: 'express',
    country: 'FR',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
  })
}

/** Lien d'onboarding hébergé par Stripe (IBAN, identité, infos légales). */
export async function createOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string) {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  })
}

/** Récupère l'état d'un compte connecté (charges/payouts activés ?). */
export async function retrieveAccount(accountId: string) {
  return stripe.accounts.retrieve(accountId)
}

/** Lien de connexion au dashboard Express (solde, virements) hébergé par Stripe. */
export async function createExpressLoginLink(accountId: string) {
  return stripe.accounts.createLoginLink(accountId)
}

/** Solde disponible et en attente sur un compte connecté. */
export async function getAccountBalance(accountId: string) {
  return stripe.balance.retrieve({ stripeAccount: accountId })
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
