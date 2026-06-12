import { NextRequest, NextResponse } from 'next/server'
import { stripeClient } from '@/lib/stripe-client'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/connect-demo/account-link  { accountId }
 * Crée un lien d'onboarding hébergé par Stripe via l'API **V2** Account Links.
 * L'utilisateur y renseigne son identité, ses coordonnées bancaires, etc.
 *
 * `use_case.account_onboarding.configurations: ['recipient']` doit correspondre
 * à la configuration demandée à la création du compte.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(); if ('error' in guard) return guard.error
  try {
    const { accountId } = await req.json()
    if (!accountId) {
      return NextResponse.json({ error: 'accountId requis' }, { status: 400 })
    }

    // URL racine de l'app (placeholder : définissez NEXT_PUBLIC_APP_URL en prod)
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin

    const accountLink = await stripeClient.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['recipient'],
          // Stripe redirige ici si le lien expire → on en regénère un.
          refresh_url: `${origin}/connect-demo`,
          // Retour après onboarding ; on récupère l'accountId pour relire le statut.
          return_url: `${origin}/connect-demo?accountId=${accountId}`,
        },
      },
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err: any) {
    console.error('V2 account link error:', err?.message || err)
    return NextResponse.json(
      { error: `Stripe : ${err?.raw?.message || err?.message || 'lien indisponible'}` },
      { status: 400 }
    )
  }
}
