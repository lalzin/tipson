import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { getPaymentIntent } from '@/lib/stripe'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// POST /api/stripe/tip/confirm — vérifie le paiement puis enregistre le pourboire.
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { bucket: 'tip-confirm', limit: 15, windowMs: 60_000 })
  if (limited) return limited

  const { payment_intent_id } = await req.json()
  if (!payment_intent_id) return NextResponse.json({ error: 'paiement manquant' }, { status: 400 })

  const intent = await getPaymentIntent(payment_intent_id)
  if (intent.status !== 'succeeded') {
    return NextResponse.json({ error: `Paiement non finalisé (${intent.status})` }, { status: 402 })
  }
  if (intent.metadata?.kind !== 'tip') {
    return NextResponse.json({ error: 'Paiement invalide' }, { status: 400 })
  }

  const admin = createServiceSupabaseClient()

  // Idempotence : ne pas réenregistrer le même pourboire
  const { data: existing } = await admin
    .from('requests')
    .select('id')
    .eq('stripe_payment_intent_id', payment_intent_id)
    .maybeSingle()
  if (existing) return NextResponse.json({ ok: true })

  const { error } = await admin.from('requests').insert({
    session_id: intent.metadata.session_id,
    customer_name: intent.metadata.author_name || 'Anonyme',
    song_name: '💛 Pourboire',
    artist: '',
    request_type: 'tip',
    amount: intent.amount,
    status: 'played', // capturé immédiatement, aucune action DJ
    stripe_payment_intent_id: payment_intent_id,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
