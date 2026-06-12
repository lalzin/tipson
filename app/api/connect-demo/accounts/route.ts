import { NextRequest, NextResponse } from 'next/server'
import { stripeClient } from '@/lib/stripe-client'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/connect-demo/accounts
 * Crée un compte connecté via l'API Connect **V2**.
 *
 * Points clés (conformes aux recommandations V2) :
 *  - On ne passe JAMAIS `type: 'express' | 'standard' | 'custom'` au niveau racine.
 *  - `dashboard: 'express'` → tableau de bord Express hébergé par Stripe.
 *  - `defaults.responsibilities` : la PLATEFORME collecte les frais et assume les pertes
 *    (modèle "platform is responsible for pricing and fee collection").
 *  - `configuration.recipient` : on demande la capacité de recevoir des transferts
 *    (stripe_balance → stripe_transfers), nécessaire pour les destination charges.
 *
 * En présence d'une base de données, on stockerait ici la correspondance
 * utilisateur → accountId. Pour cette démo, on renvoie simplement l'accountId au
 * client (qui le conserve en localStorage / dans l'URL de retour).
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(); if ('error' in guard) return guard.error
  try {
    const { display_name, contact_email } = await req.json()

    if (!display_name || !contact_email) {
      return NextResponse.json(
        { error: 'Renseignez un nom (display_name) et un email (contact_email).' },
        { status: 400 }
      )
    }

    const account = await stripeClient.v2.core.accounts.create({
      display_name,                       // {From User}
      contact_email,                      // {From User}
      identity: {
        // PLACEHOLDER : pays du bénéficiaire (ex. 'fr' pour la France, 'us' pour les USA).
        country: 'fr',
      },
      dashboard: 'express',
      defaults: {
        responsibilities: {
          fees_collector: 'application',  // la plateforme collecte les frais
          losses_collector: 'application',// la plateforme assume les pertes
        },
      },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: {
                requested: true,          // pouvoir recevoir des fonds (transfers)
              },
            },
          },
        },
      },
    })

    // TODO (avec une vraie BDD) : enregistrer { userId -> account.id }
    return NextResponse.json({ accountId: account.id })
  } catch (err: any) {
    console.error('V2 account create error:', err?.message || err)
    return NextResponse.json(
      { error: `Stripe : ${err?.raw?.message || err?.message || 'création du compte impossible'}` },
      { status: 400 }
    )
  }
}
