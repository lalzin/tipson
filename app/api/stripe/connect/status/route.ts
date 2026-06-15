import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { retrieveAccountStatus, getAccountBalance } from '@/lib/stripe'
import { getPlatformCommission } from '@/lib/platform-settings'

export const dynamic = 'force-dynamic'

// GET /api/stripe/connect/status — état du compte connecté + solde (rafraîchi depuis Stripe)
export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const feePercent = await getPlatformCommission()
  const accountId = auth.profile.stripe_account_id
  if (!accountId) {
    return NextResponse.json({
      onboarded: false, charges_enabled: false, payouts_enabled: false,
      available: 0, pending: 0, feePercent,
    })
  }

  try {
    const { readyToReceivePayments, onboardingComplete } = await retrieveAccountStatus(accountId)
    // Modèle V2 recipient : "prêt à recevoir" = capacité de transfert active
    const charges_enabled = readyToReceivePayments
    const payouts_enabled = readyToReceivePayments

    // Met à jour le cache local (utilisé par create-intent pour router le paiement)
    const admin = createServiceSupabaseClient()
    await admin.from('profiles')
      .update({ charges_enabled, payouts_enabled })
      .eq('id', auth.userId)

    // Solde disponible / en attente (en centimes, EUR)
    let available = 0, pending = 0
    try {
      const bal = await getAccountBalance(accountId)
      available = (bal.available as any[]).filter(b => b.currency === 'eur').reduce((s, b) => s + b.amount, 0)
      pending = (bal.pending as any[]).filter(b => b.currency === 'eur').reduce((s, b) => s + b.amount, 0)
    } catch { /* compte pas encore prêt */ }

    return NextResponse.json({
      onboarded: onboardingComplete,
      charges_enabled, payouts_enabled, available, pending,
      feePercent,
    })
  } catch (err: any) {
    console.error('Stripe Connect status error:', err?.message || err)
    // Renvoie un état neutre (permet de relancer l'onboarding) plutôt qu'un 500
    return NextResponse.json({
      onboarded: false, charges_enabled: false, payouts_enabled: false,
      available: 0, pending: 0, feePercent,
    })
  }
}
