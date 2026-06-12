import { NextRequest, NextResponse } from 'next/server'
import { stripeClient } from '@/lib/stripe-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/connect-demo/account-status?accountId=acct_xxx
 * Lit l'état du compte connecté DIRECTEMENT depuis l'API V2 (jamais depuis une BDD,
 * comme recommandé : le statut peut changer à tout moment côté Stripe/régulateurs).
 *
 * On inclut `configuration.recipient` (pour la capacité de transfert) et
 * `requirements` (pour savoir s'il reste des informations à fournir).
 */
export async function GET(req: NextRequest) {
  try {
    const accountId = req.nextUrl.searchParams.get('accountId')
    if (!accountId) {
      return NextResponse.json({ error: 'accountId requis' }, { status: 400 })
    }

    const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
      include: ['configuration.recipient', 'requirements'],
    })

    // Prêt à recevoir des paiements ? → capacité de transfert active
    const readyToReceivePayments =
      account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === 'active'

    // Onboarding complet ? → plus rien d'exigé immédiatement
    const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status
    const onboardingComplete =
      requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due'

    return NextResponse.json({
      accountId,
      readyToReceivePayments,
      onboardingComplete,
      requirementsStatus: requirementsStatus ?? null,
    })
  } catch (err: any) {
    console.error('V2 account status error:', err?.message || err)
    return NextResponse.json(
      { error: `Stripe : ${err?.raw?.message || err?.message || 'statut indisponible'}` },
      { status: 400 }
    )
  }
}
