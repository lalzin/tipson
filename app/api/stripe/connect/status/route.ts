import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { retrieveAccount, getAccountBalance, PLATFORM_FEE_PERCENT } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// GET /api/stripe/connect/status — état du compte connecté + solde (rafraîchi depuis Stripe)
export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accountId = auth.profile.stripe_account_id
  if (!accountId) {
    return NextResponse.json({
      onboarded: false, charges_enabled: false, payouts_enabled: false,
      available: 0, pending: 0, feePercent: PLATFORM_FEE_PERCENT,
    })
  }

  const account = await retrieveAccount(accountId)
  const charges_enabled = !!account.charges_enabled
  const payouts_enabled = !!account.payouts_enabled

  // Met à jour le cache local
  const admin = createServiceSupabaseClient()
  await admin.from('profiles')
    .update({ charges_enabled, payouts_enabled })
    .eq('id', auth.userId)

  // Solde disponible / en attente (en centimes, EUR)
  let available = 0, pending = 0
  try {
    const bal = await getAccountBalance(accountId)
    available = bal.available.filter(b => b.currency === 'eur').reduce((s, b) => s + b.amount, 0)
    pending = bal.pending.filter(b => b.currency === 'eur').reduce((s, b) => s + b.amount, 0)
  } catch {
    // ignore (compte pas encore prêt)
  }

  return NextResponse.json({
    onboarded: !!account.details_submitted,
    charges_enabled,
    payouts_enabled,
    available,
    pending,
    feePercent: PLATFORM_FEE_PERCENT,
  })
}
