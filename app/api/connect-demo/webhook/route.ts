import { NextRequest, NextResponse } from 'next/server'
import { stripeClient } from '@/lib/stripe-client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/connect-demo/webhook
 * Reçoit les **thin events** de l'API V2 (obligatoire pour les comptes V2) et
 * réagit aux changements d'exigences / de capacités du compte connecté.
 *
 * Configuration côté Stripe (Dashboard → Developers → Webhooks → Add destination) :
 *  - Events from : Connected accounts
 *  - Advanced → Payload style : Thin
 *  - Événements : v2.core.account[requirements].updated
 *                 v2.core.account[configuration.recipient].capability_status_updated
 *
 * Test en local (Stripe CLI) :
 *  stripe listen \
 *    --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.recipient].capability_status_updated' \
 *    --forward-thin-to localhost:3000/api/connect-demo/webhook
 *
 * PLACEHOLDER : le secret de signature doit être défini :
 *   STRIPE_WEBHOOK_SECRET = whsec_...   (fourni par le Dashboard ou la CLI)
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET manquante : ajoutez le secret de signature du webhook (whsec_…)." },
      { status: 500 }
    )
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })

  const body = await req.text() // corps brut requis pour vérifier la signature

  // 1) Vérifie et parse la notification (thin event : ne contient que des identifiants)
  let notification
  try {
    notification = stripeClient.parseEventNotification(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature error:', err?.message || err)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    // 2) Récupère l'événement complet pour comprendre ce qui a changé
    const event = await stripeClient.v2.core.events.retrieve(notification.id)

    // 3) Traite selon le type d'événement
    switch (event.type) {
      case 'v2.core.account[requirements].updated': {
        // De nouvelles informations sont peut-être exigées du compte connecté.
        const accountId = (event as any).related_object?.id
        console.log(`[webhook] Requirements mises à jour pour ${accountId}`)
        // TODO : relire le compte (account-status) et notifier l'organisateur
        //        s'il doit compléter des informations.
        break
      }
      case 'v2.core.account[configuration.recipient].capability_status_updated': {
        // La capacité de recevoir des paiements a changé (active / inactive).
        const accountId = (event as any).related_object?.id
        console.log(`[webhook] Capacité destinataire mise à jour pour ${accountId}`)
        // TODO : mettre à jour l'état "prêt à recevoir" côté application.
        break
      }
      default:
        console.log(`[webhook] Événement non géré : ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook handling error:', err?.message || err)
    return NextResponse.json({ error: 'Erreur de traitement' }, { status: 500 })
  }
}
