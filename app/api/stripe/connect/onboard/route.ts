import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'
import { createOnboardingLink } from '@/lib/stripe'
import { ensureConnectAccount } from '@/lib/connect'

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

  const origin = resolveOrigin(req)
  const refreshUrl = `${origin}/dj/settings?onboarding=refresh`
  const returnUrl = `${origin}/dj/settings?onboarding=done`

  // Email obligatoire pour un compte recipient.
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const contactEmail = user?.email || (auth.profile as any).email || ''
  if (!contactEmail || !contactEmail.includes('@')) {
    return NextResponse.json(
      { error: 'Ajoutez une adresse email à votre compte pour activer les versements.' },
      { status: 400 }
    )
  }

  try {
    // Garantit un compte recipient valide (réutilise si accessible + bonne config,
    // sinon recrée). Idempotent → règle les comptes périmés/inaccessibles.
    let accountId = await ensureConnectAccount({ userId: auth.userId, email: contactEmail, displayName: auth.profile.dj_name })

    try {
      const link = await createOnboardingLink(accountId, refreshUrl, returnUrl)
      return NextResponse.json({ url: link.url })
    } catch (err: any) {
      // Filet de sécurité : si le lien échoue encore (config incompatible), on
      // force une recréation et on réessaie une fois.
      const code = err?.code || err?.raw?.code || ''
      const msg = err?.raw?.message || err?.message || ''
      const staleAccount =
        code === 'configs_must_match_to_use_account_links'
        || code === 'forbidden' || code === 'resource_missing' || code === 'account_invalid'
        || /configs_must_match|configuration|no such account|permission denied|access the object acct/i.test(msg)
      if (!staleAccount) throw err

      const admin = createServiceSupabaseClient()
      await admin.from('profiles').update({ stripe_account_id: null }).eq('id', auth.userId)
      accountId = await ensureConnectAccount({ userId: auth.userId, email: contactEmail, displayName: auth.profile.dj_name })
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
