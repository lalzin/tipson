import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { stripe, platformFee } from '@/lib/stripe'
import { getPlatformCommission } from '@/lib/platform-settings'
import { rateLimit, isValidUuid } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// POST /api/stripe/tip/intent — pourboire libre « au chapeau » (capture immédiate).
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { bucket: 'tip-intent', limit: 15, windowMs: 60_000 })
  if (limited) return limited

  const { session_id, amount, author_name } = await req.json()
  if (!isValidUuid(session_id)) return NextResponse.json({ error: 'Session invalide' }, { status: 400 })

  const cents = Math.round(Number(amount))
  if (!Number.isFinite(cents) || cents < 100) return NextResponse.json({ error: 'Montant minimum : 1 €' }, { status: 422 })
  if (cents > 50000) return NextResponse.json({ error: 'Montant trop élevé' }, { status: 422 })

  const admin = createServiceSupabaseClient()
  const { data: session } = await admin.from('sessions').select('id, status, dj_id').eq('id', session_id).single()
  if (!session || session.status !== 'active') return NextResponse.json({ error: 'Session inactive' }, { status: 404 })

  // Route vers le compte du DJ s'il est onboardé
  let destination: string | undefined
  const { data: dj } = await admin.from('profiles').select('stripe_account_id, charges_enabled').eq('id', session.dj_id).single()
  if (dj?.stripe_account_id && dj.charges_enabled) destination = dj.stripe_account_id

  const feePercent = await getPlatformCommission()
  const intent = await stripe.paymentIntents.create({
    amount: cents,
    currency: 'eur',
    description: 'TIPSON · pourboire',
    automatic_payment_methods: { enabled: true },
    metadata: {
      kind: 'tip',
      session_id,
      author_name: author_name ? String(author_name).slice(0, 40) : '',
    },
    ...(destination ? { transfer_data: { destination }, application_fee_amount: platformFee(cents, feePercent) } : {}),
  })

  return NextResponse.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id, amount: cents })
}
