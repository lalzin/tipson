import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { createAuthorization } from '@/lib/stripe'
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
    .select('id, song_name, artist, amount, status, session_id')
    .eq('id', request_id)
    .eq('status', 'pending_payment')
    .single()

  if (error || !request) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  if (!request.amount || request.amount < 50) {
    return NextResponse.json({ error: 'Montant invalide (minimum 0,50 €)' }, { status: 400 })
  }

  const intent = await createAuthorization(
    request.amount,
    `TIPSON — ${request.song_name} par ${request.artist}`,
    { request_id: request.id, session_id: request.session_id },
  )

  await supabase
    .from('requests')
    .update({ stripe_payment_intent_id: intent.id })
    .eq('id', request_id)

  return NextResponse.json({ clientSecret: intent.client_secret })
}
