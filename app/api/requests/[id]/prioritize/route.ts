import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'
import { isValidUuid } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// POST /api/requests/[id]/prioritize — le DJ place une demande en tête de file (karaoké).
// Réservé au DJ propriétaire de la session.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isValidUuid(params.id)) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceSupabaseClient()
  const { data: request, error } = await admin
    .from('requests')
    .select('id, session_id, status, sessions!inner(dj_id)')
    .eq('id', params.id)
    .single()

  if (error || !request) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  if ((request as any).sessions.dj_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Position minimale parmi les demandes encore en file → on se place juste devant
  const { data: minRow } = await admin
    .from('requests')
    .select('queue_position')
    .eq('session_id', request.session_id)
    .in('status', ['paid', 'approved'])
    .order('queue_position', { ascending: true })
    .limit(1)
    .single()

  const minPos = minRow?.queue_position ?? 1
  const newPos = Math.max(0, minPos - 1)

  const { data: updated, error: upErr } = await admin
    .from('requests')
    .update({ queue_position: newPos })
    .eq('id', params.id)
    .select()
    .single()

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
  return NextResponse.json(updated)
}
