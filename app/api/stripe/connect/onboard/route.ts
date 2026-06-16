import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'
import { createConnectAccount, createOnboardingLink } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// Origine fiable : on ignore NEXT_PUBLIC_APP_URL si elle pointe sur localhost
// (variable mal copiée en prod), et on reconstruit depuis les headers du proxy Vercel.
function resolveOrigin(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL
  if (env && !/localhost|127\.0\.0\.1/.test(env)) return env.replace(/\/$/, '')
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  if (host) return `${proto}://${host}`
  return new URL(req.url).origin
}

// POST /api/stripe/connect/onboard — crée le compte Connect si besoin et renvoie
// le lien d'onboarding hébergé par Stripe (IBAN, identité, infos légales).
export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!auth.profile.is_dj && !auth.profile.is_admin) {
    return NextResponse.json({ error: 'Compte organisateur requis' }, { status: 403 })
  }

  const admin = createServiceSupabaseClient()
  const origin = resolveOrigin(req)
  const refreshUrl = `${origin}/dj/settings?onboarding=refresh`
  const returnUrl = `${origin}/dj/settings?onboarding=done`

  // Crée un nouveau compte Connect et le persiste sur le profil
  async function freshAccount(): Promise<string> {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    const account = await createConnectAccount(user?.email ?? undefined, auth!.profile.dj_name)
    await admin.from('profiles').update({ stripe_account_id: account.id }).eq('id', auth!.userId)
    return account.id
  }

  try {
    let accountId = auth.profile.stripe_account_id || await freshAccount()

    try {
      const link = await createOnboardingLink(accountId, refreshUrl, returnUrl)
      return NextResponse.json({ url: link.url })
    } catch (err: any) {
      // Compte existant incompatible (créé avec une autre configuration que
      // 'recipient', ex. ancienne version du code) → on recrée et on réessaie.
      const code = err?.code || err?.raw?.code || ''
      const msg = err?.raw?.message || err?.message || ''
      const mismatch = code === 'configs_must_match_to_use_account_links'
        || /configs_must_match|configuration|No such account/i.test(msg)
      if (!mismatch) throw err

      accountId = await freshAccount()
      const link = await createOnboardingLink(accountId, refreshUrl, returnUrl)
      return NextResponse.json({ url: link.url })
    }
  } catch (err: any) {
    console.error('Stripe Connect onboard error:', err?.message || err)
    const msg = err?.raw?.message || err?.message || 'Erreur Stripe'
    return NextResponse.json(
      { error: `Stripe : ${msg}. Vérifiez que Stripe Connect est activé sur votre compte.` },
      { status: 400 }
    )
  }
}
