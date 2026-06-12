import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { createExpressLoginLink } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// POST /api/stripe/connect/dashboard — lien de connexion au dashboard Express
// (solde, historique des virements) hébergé par Stripe.
export async function POST() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!auth.profile.stripe_account_id) {
    return NextResponse.json({ error: 'Aucun compte de versement configuré' }, { status: 400 })
  }

  try {
    const link = await createExpressLoginLink(auth.profile.stripe_account_id)
    return NextResponse.json({ url: link.url })
  } catch {
    return NextResponse.json({ error: 'Dashboard indisponible (onboarding incomplet ?)' }, { status: 400 })
  }
}
