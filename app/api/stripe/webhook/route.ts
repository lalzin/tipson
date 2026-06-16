import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { recordTipFromIntent, recordSuperMessageFromIntent } from '@/lib/payment-records'
import { sendEmail, receiptHtml } from '@/lib/email'

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
        await sendReceipt(pi)
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

// Envoie un reçu au client après un paiement encaissé.
async function sendReceipt(pi: Stripe.PaymentIntent) {
  try {
    const admin = createServiceSupabaseClient()

    // Email du client : saisi dans Stripe (billing_details) ou sur la demande
    let email = pi.receipt_email || null
    if (!email && pi.latest_charge) {
      const charge = await stripe.charges.retrieve(String(pi.latest_charge))
      email = charge.billing_details?.email || charge.receipt_email || null
    }

    // Objet + session selon le type de paiement
    let label = 'Demande musicale'
    let sessionId = pi.metadata?.session_id || null
    if (pi.metadata?.kind === 'tip') label = '💛 Pourboire au chapeau'
    else if (pi.metadata?.kind === 'super_message') label = '✨ Super-message'
    else if (pi.metadata?.request_id) {
      const { data: r } = await admin
        .from('requests')
        .select('song_name, artist, customer_email, session_id')
        .eq('id', pi.metadata.request_id).maybeSingle()
      if (r) {
        label = `🎵 ${r.song_name}${r.artist ? ' · ' + r.artist : ''}`
        sessionId = r.session_id || sessionId
        if (!email) email = r.customer_email || null
      }
    }
    if (!email) return // pas d'email → pas de reçu (silencieux)

    let sessionName: string | undefined, djName: string | undefined
    if (sessionId) {
      const { data: s } = await admin
        .from('sessions').select('name, profiles!inner(dj_name)').eq('id', sessionId).maybeSingle()
      if (s) { sessionName = (s as any).name; djName = (s as any).profiles?.dj_name }
    }

    await sendEmail({
      to: email,
      subject: 'Votre reçu TIPSON',
      html: receiptHtml({ amountCents: pi.amount, label, djName, sessionName }),
    })
  } catch (e) {
    console.error('sendReceipt error:', e)
  }
}
