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

  // Email obligatoire pour un compte recipient. On le résout depuis l'auth
  // (repli sur l'email du profil le cas échéant).
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const contactEmail = user?.email || (auth.profile as any).email || ''
  if (!contactEmail || !contactEmail.includes('@')) {
    return NextResponse.json(
      { error: 'Ajoutez une adresse email à votre compte pour activer les versements.' },
      { status: 400 }
    )
  }

  // Crée un nouveau compte Connect et le persiste sur le profil
  async function freshAccount(): Promise<string> {
    const account = await createConnectAccount(contactEmail, auth!.profile.dj_name)
    await admin.from('profiles')
      .update({ stripe_account_id: account.id, charges_enabled: false, payouts_enabled: false })
      .eq('id', auth!.userId)
    return account.id
  }

  try {
    let accountId = auth.profile.stripe_account_id || await freshAccount()

    try {
      const link = await createOnboardingLink(accountId, refreshUrl, returnUrl)
      return NextResponse.json({ url: link.url })
    } catch (err: any) {
      // Le compte stocké est inutilisable par cette clé : créé avec d'anciennes
      // clés (permission denied), supprimé (No such account), ou avec une
      // configuration incompatible (configs_must_match). → on recrée et on réessaie.
      const code = err?.code || err?.raw?.code || ''
      const msg = err?.raw?.message || err?.message || ''
      const staleAccount =
        code === 'configs_must_match_to_use_account_links'
        || code === 'forbidden'
        || code === 'resource_missing'
        || code === 'account_invalid'
        || /configs_must_match|configuration|no such account|does not have permission to access the object acct|permission denied/i.test(msg)
      if (!staleAccount) throw err

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
