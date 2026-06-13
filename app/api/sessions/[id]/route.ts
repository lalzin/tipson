import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'
import { cancelPayment } from '@/lib/stripe'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', params.id)
    .eq('dj_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceSupabaseClient()

  // Vérifie la propriété
  const { data: owned, error: ownErr } = await admin
    .from('sessions')
    .select('id, dj_id')
    .eq('id', params.id)
    .single()

  if (ownErr || !owned) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
  if (owned.dj_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Supprime d'abord les demandes liées (au cas où il n'y a pas de ON DELETE CASCADE)
  await admin.from('requests').delete().eq('session_id', params.id)

  const { error } = await admin
    .from('sessions')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceSupabaseClient()

  // Vérifie la propriété de la session
  const { data: owned, error: ownErr } = await admin
    .from('sessions')
    .select('id, dj_id')
    .eq('id', params.id)
    .single()

  if (ownErr || !owned) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
  if (owned.dj_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if (body.status) updates.status = body.status
  if (body.status === 'ended') updates.ended_at = new Date().toISOString()
  if (body.status === 'active') updates.ended_at = null
  if (body.price_normal !== undefined) updates.price_normal = body.price_normal
  if (body.price_priority !== undefined) updates.price_priority = body.price_priority
  if (body.price_karaoke !== undefined) updates.price_karaoke = body.price_karaoke
  if (body.price_karaoke_priority !== undefined) updates.price_karaoke_priority = body.price_karaoke_priority
  if (body.express_enabled !== undefined) updates.express_enabled = !!body.express_enabled
  if (body.display_enabled !== undefined) updates.display_enabled = !!body.display_enabled
  if (body.messages_enabled !== undefined) updates.messages_enabled = !!body.messages_enabled
  if (body.super_messages_enabled !== undefined) updates.super_messages_enabled = !!body.super_messages_enabled
  if (body.price_super_message !== undefined) updates.price_super_message = body.price_super_message
  if (body.display_bg !== undefined) updates.display_bg = body.display_bg
  if (body.toxicity_threshold !== undefined) updates.toxicity_threshold = Math.max(10, Math.min(100, Number(body.toxicity_threshold)))
  if (body.display_show_dj !== undefined) updates.display_show_dj = !!body.display_show_dj
  if (body.display_show_venue !== undefined) updates.display_show_venue = !!body.display_show_venue
  if (body.name !== undefined) updates.name = body.name

  // Update via service client → bypasse les subtilités RLS (RETURNING filtré quand status != active)
  const { data, error } = await admin
    .from('sessions')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Clôture : annule les autorisations Stripe en attente (aucun débit, aucun frais)
  if (body.status === 'ended') {
    admin
      .from('requests')
      .select('id, stripe_payment_intent_id')
      .eq('session_id', params.id)
      .in('status', ['paid', 'approved', 'pending_payment'])
      .then(({ data: pendingRequests }) => {
        if (!pendingRequests?.length) return
        pendingRequests.forEach(async (r) => {
          try {
            if (r.stripe_payment_intent_id) {
              await cancelPayment(r.stripe_payment_intent_id)
              await admin.from('requests').update({ status: 'rejected', refunded: true }).eq('id', r.id)
            } else {
              await admin.from('requests').update({ status: 'rejected' }).eq('id', r.id)
            }
          } catch (err) {
            console.error(`Cancel failed for request ${r.id}:`, err)
            await admin.from('requests').update({ status: 'rejected' }).eq('id', r.id)
          }
        })
      })
  }

  return NextResponse.json(data)
}
