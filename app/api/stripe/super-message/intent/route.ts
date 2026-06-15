import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { stripe, platformFee } from '@/lib/stripe'
import { rateLimit, isValidUuid } from '@/lib/rate-limit'
import { moderateMessage } from '@/lib/moderation'
import { getOpenAIModeration } from '@/lib/openai-moderation'
import { getToxicity, toxicityMessage } from '@/lib/perspective'

export const dynamic = 'force-dynamic'

// POST /api/stripe/super-message/intent — crée un paiement (capture immédiate)
// pour un super-message. Le texte est modéré ici et stocké dans les métadonnées.
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { bucket: 'super-intent', limit: 15, windowMs: 60_000 })
  if (limited) return limited

  const { session_id, text, author_name } = await req.json()
  if (!isValidUuid(session_id)) return NextResponse.json({ error: 'Session invalide' }, { status: 400 })

  const raw = String(text || '').trim()
  if (!raw || raw.length > 140) return NextResponse.json({ error: 'Message invalide' }, { status: 422 })

  const admin = createServiceSupabaseClient()
  const { data: session } = await admin
    .from('sessions')
    .select('*')
    .eq('id', session_id)
    .single()

  if (!session || session.status !== 'active') return NextResponse.json({ error: 'Session inactive' }, { status: 404 })
  if (!session.super_messages_enabled) return NextResponse.json({ error: 'Super-messages désactivés' }, { status: 403 })

  // Modération avant de facturer : dictionnaire (toujours actif) puis
  // couche ML OpenAI (principale) → Perspective (dernier fallback).
  const dict = moderateMessage(raw)
  if (!dict.ok) return NextResponse.json({ error: dict.reason }, { status: 422 })
  const threshold = (session.toxicity_threshold ?? 60) / 100
  const oai = await getOpenAIModeration(raw)
  if (oai !== null) {
    if (oai.flagged || oai.score >= threshold) {
      return NextResponse.json({ error: toxicityMessage(oai.score) }, { status: 422 })
    }
  } else {
    const score = await getToxicity(raw)
    if (score !== null && score >= threshold) {
      return NextResponse.json({ error: toxicityMessage(score) }, { status: 422 })
    }
  }

  const amount = session.price_super_message ?? 200
  if (amount < 50) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })

  // Route vers le compte du DJ s'il est onboardé
  let destination: string | undefined
  const { data: dj } = await admin.from('profiles').select('stripe_account_id, charges_enabled').eq('id', session.dj_id).single()
  if (dj?.stripe_account_id && dj.charges_enabled) destination = dj.stripe_account_id

  const intent = await stripe.paymentIntents.create({
    amount,
    currency: 'eur',
    description: 'TIPSON — super-message',
    automatic_payment_methods: { enabled: true },
    metadata: {
      kind: 'super_message',
      session_id,
      text: raw.slice(0, 140),
      author_name: author_name ? String(author_name).slice(0, 40) : '',
    },
    ...(destination ? { transfer_data: { destination }, application_fee_amount: platformFee(amount) } : {}),
  })

  return NextResponse.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id, amount })
}
