import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { cancelPayment } from '@/lib/stripe'
import { rateLimit, isValidUuid } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// POST /api/requests/[id]/cancel — annulation par le client (droit de rétractation).
// Possible uniquement AVANT validation du DJ (statut pending_payment ou paid).
// L'identifiant de demande (UUID non devinable, stocké chez le client) fait office
// de preuve de propriété pour les participants non connectés.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = rateLimit(req, { bucket: 'cancel', limit: 10, windowMs: 60_000 })
  if (limited) return limited
  if (!isValidUuid(params.id)) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const admin = createServiceSupabaseClient()
  const { data: request, error } = await admin
    .from('requests')
    .select('id, status, amount, stripe_payment_intent_id')
    .eq('id', params.id)
    .single()

  if (error || !request) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

  // Annulable seulement tant que le DJ n'a pas validé
  if (!['pending_payment', 'paid'].includes(request.status)) {
    return NextResponse.json(
      { error: 'Cette demande ne peut plus être annulée (déjà traitée par le DJ).' },
      { status: 409 }
    )
  }

  // Annule l'autorisation Stripe (aucun débit, aucun frais)
  if (request.stripe_payment_intent_id && request.amount > 0) {
    try {
      await cancelPayment(request.stripe_payment_intent_id)
    } catch (err) {
      console.error('Stripe cancel (rétractation) error:', err)
    }
  }

  const { error: upErr } = await admin
    .from('requests')
    .update({ status: 'rejected', refunded: true })
    .eq('id', params.id)

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
