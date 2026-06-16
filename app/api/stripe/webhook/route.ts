import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { recordTipFromIntent, recordSuperMessageFromIntent } from '@/lib/payment-records'

export const dynamic = 'force-dynamic'

// POST /api/stripe/webhook — source de vérité des événements de paiement.
// Garantit l'enregistrement (pourboire / super-message) et le suivi des
// remboursements indépendamment du navigateur du client. Idempotent.
//
// Configurer STRIPE_WEBHOOK_SECRET (signing secret du endpoint Stripe) et
// pointer le webhook Stripe vers cette URL avec les événements :
//   payment_intent.succeeded, charge.refunded
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const sig = req.headers.get('stripe-signature')
  if (!secret || !sig) return NextResponse.json({ error: 'Webhook non configuré' }, { status: 400 })

  const raw = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret)
  } catch (err) {
    console.error('Webhook signature invalide:', err)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        if (pi.metadata?.kind === 'tip') await recordTipFromIntent(pi)
        else if (pi.metadata?.kind === 'super_message') await recordSuperMessageFromIntent(pi)
        // Reçu client : géré par Stripe (Customer emails). Pas d'email TIPSON ici.
        break
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        if (charge.payment_intent) {
          const admin = createServiceSupabaseClient()
          await admin.from('requests')
            .update({ refunded: true })
            .eq('stripe_payment_intent_id', String(charge.payment_intent))
        }
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    // 200 quand même : on évite que Stripe rejoue en boucle un événement déjà encaissé
  }

  return NextResponse.json({ received: true })
}

