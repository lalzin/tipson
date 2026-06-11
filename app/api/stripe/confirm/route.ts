import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { getPaymentIntent } from '@/lib/stripe'
import { rateLimit, isValidUuid } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// POST /api/stripe/confirm — vérifie côté serveur que l'autorisation est bien
// en place (statut requires_capture) avant de marquer la demande comme payée.
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { bucket: 'pay-confirm', limit: 20, windowMs: 60_000 })
  if (limited) return limited

  const { request_id } = await req.json()
  if (!isValidUuid(request_id)) return NextResponse.json({ error: 'request_id invalide' }, { status: 400 })

  const supabase = createServiceSupabaseClient()
  const { data: request, error } = await supabase
    .from('requests')
    .select('id, stripe_payment_intent_id, status')
    .eq('id', request_id)
    .single()

  if (error || !request?.stripe_payment_intent_id) {
    return NextResponse.json({ error: 'Demande ou paiement introuvable' }, { status: 404 })
  }

  const intent = await getPaymentIntent(request.stripe_payment_intent_id)
  // requires_capture = autorisé, en attente de validation DJ (le cas attendu)
  const authorized = ['requires_capture', 'processing', 'succeeded'].includes(intent.status)
  if (!authorized) {
    return NextResponse.json({ error: `Paiement non confirmé (${intent.status})` }, { status: 402 })
  }

  const { data: updated, error: upErr } = await supabase
    .from('requests')
    .update({ status: 'paid' })
    .eq('id', request_id)
    .select()
    .single()

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
  return NextResponse.json(updated)
}
