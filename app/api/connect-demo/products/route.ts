import { NextRequest, NextResponse } from 'next/server'
import { stripeClient } from '@/lib/stripe-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/connect-demo/products
 * Liste tous les produits (créés au niveau PLATEFORME). Le compte connecté
 * destinataire est stocké dans les métadonnées du produit.
 */
export async function GET() {
  try {
    const products = await stripeClient.products.list({
      active: true,
      limit: 100,
      expand: ['data.default_price'],
    })

    const data = products.data.map((p) => {
      const price = p.default_price as any
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        priceId: price?.id ?? null,
        unitAmount: price?.unit_amount ?? null,
        currency: price?.currency ?? 'eur',
        connectedAccountId: p.metadata?.connected_account_id ?? null,
      }
    }).filter(p => p.priceId && p.connectedAccountId)

    return NextResponse.json({ products: data })
  } catch (err: any) {
    console.error('Products list error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Erreur' }, { status: 400 })
  }
}

/**
 * POST /api/connect-demo/products  { name, description, priceInCents, connectedAccountId }
 * Crée un produit au niveau PLATEFORME (PAS sur le compte connecté).
 * On enregistre la correspondance produit → compte connecté dans les métadonnées.
 */
export async function POST(req: NextRequest) {
  try {
    const { name, description, priceInCents, connectedAccountId, currency } = await req.json()

    if (!name || !priceInCents || !connectedAccountId) {
      return NextResponse.json(
        { error: 'Nom, prix et compte connecté (connectedAccountId) sont requis.' },
        { status: 400 }
      )
    }

    const product = await stripeClient.products.create({
      name,
      description: description || undefined,
      default_price_data: {
        unit_amount: Math.round(Number(priceInCents)),
        currency: currency || 'eur',
      },
      // Mapping produit → compte connecté (utilisé au checkout pour le destination charge)
      metadata: { connected_account_id: connectedAccountId },
    })

    return NextResponse.json({ productId: product.id })
  } catch (err: any) {
    console.error('Product create error:', err?.message || err)
    return NextResponse.json(
      { error: `Stripe : ${err?.raw?.message || err?.message || 'création du produit impossible'}` },
      { status: 400 }
    )
  }
}
