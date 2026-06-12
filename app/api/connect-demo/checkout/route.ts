import { NextRequest, NextResponse } from 'next/server'
import { stripeClient, applicationFeeAmount } from '@/lib/stripe-client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/connect-demo/checkout  { productId }
 * Crée une session Stripe Checkout (hébergée) avec un **Destination Charge** :
 *  - `transfer_data.destination` : le compte connecté qui reçoit les fonds
 *  - `application_fee_amount`     : la commission prélevée par la plateforme
 * La plateforme est responsable de la tarification et de la collecte des frais.
 */
export async function POST(req: NextRequest) {
  try {
    const { productId } = await req.json()
    if (!productId) {
      return NextResponse.json({ error: 'productId requis' }, { status: 400 })
    }

    // On relit le produit pour récupérer son prix + le compte connecté destinataire
    const product = await stripeClient.products.retrieve(productId, { expand: ['default_price'] })
    const price = product.default_price as any
    const connectedAccountId = product.metadata?.connected_account_id

    if (!price?.id || !connectedAccountId) {
      return NextResponse.json({ error: 'Produit mal configuré (prix ou compte manquant).' }, { status: 400 })
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin

    const session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        { price: price.id, quantity: 1 },
      ],
      payment_intent_data: {
        // Commission plateforme (ex. 10% du montant)
        application_fee_amount: applicationFeeAmount(price.unit_amount),
        // Les fonds (moins la commission) vont au compte connecté
        transfer_data: { destination: connectedAccountId },
      },
      success_url: `${origin}/connect-demo/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/connect-demo`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Checkout error:', err?.message || err)
    return NextResponse.json(
      { error: `Stripe : ${err?.raw?.message || err?.message || 'checkout impossible'}` },
      { status: 400 }
    )
  }
}
