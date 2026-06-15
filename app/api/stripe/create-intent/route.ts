import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { createAuthorization } from '@/lib/stripe'
import { getPlatformCommission } from '@/lib/platform-settings'
import { rateLimit, isValidUuid } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// POST /api/stripe/create-intent — crée une autorisation Stripe pour une demande
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { bucket: 'pay-intent', limit: 20, windowMs: 60_000 })
  if (limited) return limited

  const { request_id } = await req.json()
  if (!isValidUuid(request_id)) return NextResponse.json({ error: 'request_id invalide' }, { status: 400 })

  const supabase = createServiceSupabaseClient()
  const { data: request, error } = await supabase
    .from('requests')
    .select('id, song_name, artist, amount, status, session_id, sessions!inner(dj_id)')
    .eq('id', request_id)
    .eq('status', 'pending_payment')
    .single()

  if (error || !request) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  if (!request.amount || request.amount < 50) {
    return NextResponse.json({ error: 'Montant invalide (minimum 0,50 €)' }, { status: 400 })
  }

  // Route le paiement vers le compte du DJ s'il a activé ses versements (Connect).
  // Sinon, le paiement va sur le compte central (comportement actuel, fonds à
  // reverser manuellement — d'où l'intérêt d'inciter à l'onboarding).
  const djId = (request as any).sessions?.dj_id
  let destinationAccount: string | undefined
  if (djId) {
    const { data: dj } = await supabase
      .from('profiles')
      .select('stripe_account_id, charges_enabled')
      .eq('id', djId)
      .single()
    if (dj?.stripe_account_id && dj.charges_enabled) {
      destinationAccount = dj.stripe_account_id
    }
  }

  const feePercent = await getPlatformCommission()
  const intent = await createAuthorization(
    request.amount,
    `TIPSON · ${request.song_name} par ${request.artist}`,
    { request_id: request.id, session_id: request.session_id },
    destinationAccount,
    feePercent,
  )

  await supabase
    .from('requests')
    .update({ stripe_payment_intent_id: intent.id })
    .eq('id', request_id)

  return NextResponse.json({ clientSecret: intent.client_secret })
}
