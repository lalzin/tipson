import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'
import { isValidUuid } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

async function ownerGuard(sessionId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: session } = await supabase
    .from('sessions').select('id').eq('id', sessionId).eq('dj_id', user.id).single()
  if (!session) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { ok: true }
}

// GET — liste des participants bannis de la session
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await ownerGuard(params.id)
  if ('error' in guard) return guard.error
  const admin = createServiceSupabaseClient()
  const { data } = await admin
    .from('session_bans')
    .select('id, label, reason, block_ip, created_at')
    .eq('session_id', params.id)
    .order('created_at', { ascending: false })
  return NextResponse.json({ bans: data ?? [] })
}

// POST — bannir le participant d'une demande { request_id, block_ip?, reason? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await ownerGuard(params.id)
  if ('error' in guard) return guard.error
  if (!isValidUuid(params.id)) return NextResponse.json({ error: 'Session invalide' }, { status: 400 })

  const { request_id, block_ip, reason } = await req.json().catch(() => ({}))
  if (!isValidUuid(request_id)) return NextResponse.json({ error: 'Demande invalide' }, { status: 400 })

  const admin = createServiceSupabaseClient()
  const { data: r } = await admin
    .from('requests')
    .select('id, client_id, customer_user_id, ip, customer_name')
    .eq('id', request_id)
    .eq('session_id', params.id)
    .single()
  if (!r) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

  if (!r.client_id && !r.customer_user_id && !r.ip) {
    return NextResponse.json({ error: 'Impossible d\'identifier ce participant.' }, { status: 422 })
  }

  const { data: ban, error } = await admin.from('session_bans').insert({
    session_id: params.id,
    client_id: r.client_id || null,
    user_id: r.customer_user_id || null,
    ip: r.ip || null,
    block_ip: !!block_ip,
    reason: reason ? String(reason).slice(0, 200) : null,
    label: r.customer_name || null,
  }).select('id, label, reason, block_ip, created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Retire ses demandes en cours (par appareil/compte) de cette session
  const orParts: string[] = []
  if (r.client_id) orParts.push(`client_id.eq.${r.client_id}`)
  if (r.customer_user_id) orParts.push(`customer_user_id.eq.${r.customer_user_id}`)
  if (orParts.length) {
    await admin.from('requests')
      .update({ status: 'rejected' })
      .eq('session_id', params.id)
      .in('status', ['pending_payment', 'paid', 'approved'])
      .or(orParts.join(','))
  }

  return NextResponse.json({ ban })
}

// DELETE — lever un bannissement { ban_id }
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await ownerGuard(params.id)
  if ('error' in guard) return guard.error
  const { ban_id } = await req.json().catch(() => ({}))
  if (!isValidUuid(ban_id)) return NextResponse.json({ error: 'Ban invalide' }, { status: 400 })
  const admin = createServiceSupabaseClient()
  await admin.from('session_bans').delete().eq('id', ban_id).eq('session_id', params.id)
  return NextResponse.json({ ok: true })
}
