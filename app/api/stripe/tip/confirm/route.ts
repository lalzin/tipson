import { NextRequest, NextResponse } from 'next/server'
import { getPaymentIntent } from '@/lib/stripe'
import { recordTipFromIntent } from '@/lib/payment-records'
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

  await recordTipFromIntent(intent) // idempotent (aussi géré par le webhook)
  return NextResponse.json({ ok: true })
}
