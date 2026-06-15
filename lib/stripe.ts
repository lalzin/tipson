import Stripe from 'stripe'

// La version d'API n'est pas épinglée : le SDK utilise automatiquement la
// version courante (2026-05-27.dahlia avec ce SDK).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Commission de la plateforme prélevée sur chaque pourboire (en %).
// Valeur par défaut/repli ; la valeur réelle est gérée en base (admin) via
// lib/platform-settings.ts et passée à platformFee/createAuthorization.
export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 10)

/** Montant de la commission plateforme (en centimes) pour un pourboire donné. */
export function platformFee(amountCents: number, percent: number = PLATFORM_FEE_PERCENT): number {
  return Math.round(amountCents * (percent / 100))
}

/**
 * Crée une autorisation de paiement (fonds bloqués, NON prélevés).
 * On capture seulement quand le DJ accepte, on annule s'il refuse → aucune
 * perte de frais sur les demandes refusées.
 *
 * Si `destinationAccount` est fourni (DJ avec compte Connect actif), le paiement
 * est routé vers son compte : Stripe lui verse le montant moins la commission
 * plateforme. Les fonds (moins la commission) sont transférés au compte du DJ.
 * Modèle V2 "recipient" : pas d'on_behalf_of (la plateforme reste merchant of record).
 */
export async function createAuthorization(
  amountCents: number,
  description: string,
  metadata: Record<string, string>,
  destinationAccount?: string,
  feePercent?: number,
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
    base.transfer_data = { destination: destinationAccount }
    base.application_fee_amount = platformFee(amountCents, feePercent)
  }

  return stripe.paymentIntents.create(base)
}

// ── Stripe Connect V2 (versements aux organisateurs) ────────────────────────

/** Crée un compte connecté V2 (configuration "recipient") pour un organisateur. */
export async function createConnectAccount(email?: string, displayName?: string) {
  return stripe.v2.core.accounts.create({
    display_name: displayName,
    contact_email: email,
    identity: { country: 'fr' },
    dashboard: 'express',
    defaults: {
      responsibilities: {
        fees_collector: 'application',
        losses_collector: 'application',
      },
    },
    configuration: {
      recipient: {
        capabilities: {
          stripe_balance: { stripe_transfers: { requested: true } },
        },
      },
    },
  })
}

/** Lien d'onboarding hébergé par Stripe (V2 Account Links). */
export async function createOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string) {
  return stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        configurations: ['recipient'],
        refresh_url: refreshUrl,
        return_url: returnUrl,
      },
    },
  })
}

/**
 * Statut d'un compte connecté V2 :
 *  - readyToReceivePayments : capacité de transfert active (peut recevoir des fonds)
 *  - onboardingComplete     : plus aucune information exigée immédiatement
 */
export async function retrieveAccountStatus(accountId: string) {
  const account = await stripe.v2.core.accounts.retrieve(accountId, {
    include: ['configuration.recipient', 'requirements'],
  })
  const readyToReceivePayments =
    account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === 'active'
  const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status
  const onboardingComplete =
    requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due'
  return { readyToReceivePayments, onboardingComplete }
}

/** Lien vers le dashboard Express (solde, virements). Best-effort pour comptes V2. */
export async function createExpressLoginLink(accountId: string) {
  return stripe.accounts.createLoginLink(accountId)
}

/** Solde disponible et en attente sur un compte connecté. */
export async function getAccountBalance(accountId: string) {
  // Le 2e argument (request options) cible le compte connecté
  return stripe.balance.retrieve({}, { stripeAccount: accountId })
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
