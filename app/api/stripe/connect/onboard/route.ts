import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'
import { createExpressAccount, createOnboardingLink } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// POST /api/stripe/connect/onboard — crée le compte Connect si besoin et renvoie
// le lien d'onboarding hébergé par Stripe (IBAN, identité, infos légales).
export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!auth.profile.is_dj && !auth.profile.is_admin) {
    return NextResponse.json({ error: 'Compte organisateur requis' }, { status: 403 })
  }

  const admin = createServiceSupabaseClient()
  let accountId = auth.profile.stripe_account_id

  if (!accountId) {
    // Email pour pré-remplir l'onboarding
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    const account = await createExpressAccount(user?.email ?? undefined)
    accountId = account.id
    await admin.from('profiles').update({ stripe_account_id: accountId }).eq('id', auth.userId)
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  const link = await createOnboardingLink(
    accountId,
    `${origin}/dj/settings?onboarding=refresh`,
    `${origin}/dj/settings?onboarding=done`,
  )

  return NextResponse.json({ url: link.url })
}
