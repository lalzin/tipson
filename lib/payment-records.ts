import type Stripe from 'stripe'
import { createServiceSupabaseClient } from '@/lib/supabase-server'

// Enregistrement idempotent des paiements à capture immédiate (pourboire,
// super-message). Appelé À LA FOIS par la route /confirm (retour client) ET par
// le webhook Stripe → l'argent est toujours enregistré, même si le client ferme
// l'onglet avant le confirm. La déduplication se fait sur stripe_payment_intent_id.

export async function recordTipFromIntent(intent: Stripe.PaymentIntent): Promise<{ ok: boolean }> {
  if (intent.metadata?.kind !== 'tip' || !intent.metadata.session_id) return { ok: false }
  const admin = createServiceSupabaseClient()
  const { data: existing } = await admin
    .from('requests').select('id').eq('stripe_payment_intent_id', intent.id).maybeSingle()
  if (existing) return { ok: true }
  await admin.from('requests').insert({
    session_id: intent.metadata.session_id,
    customer_name: intent.metadata.author_name || 'Anonyme',
    song_name: '💛 Pourboire',
    artist: '',
    request_type: 'tip',
    amount: intent.amount,
    status: 'played',
    stripe_payment_intent_id: intent.id,
  })
  return { ok: true }
}

export async function recordSuperMessageFromIntent(intent: Stripe.PaymentIntent): Promise<{ ok: boolean }> {
  if (intent.metadata?.kind !== 'super_message' || !intent.metadata.session_id) return { ok: false }
  const admin = createServiceSupabaseClient()
  const { data: existing } = await admin
    .from('messages').select('id').eq('stripe_payment_intent_id', intent.id).maybeSingle()
  if (existing) return { ok: true }
  await admin.from('messages').insert({
    session_id: intent.metadata.session_id,
    text: intent.metadata.text,
    author_name: intent.metadata.author_name || null,
    is_super: true,
    amount: intent.amount,
    stripe_payment_intent_id: intent.id,
  })
  return { ok: true }
}
