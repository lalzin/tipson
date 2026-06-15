import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// POST /api/sessions/[id]/reorder — réordonne la file (glisser-déposer côté DJ).
// Body : { ids: string[] } dans l'ordre de passage souhaité.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session } = await supabase
    .from('sessions').select('id').eq('id', params.id).eq('dj_id', user.id).single()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { ids } = await req.json().catch(() => ({}))
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'ids requis' }, { status: 400 })

  const admin = createServiceSupabaseClient()
  // Position croissante = ordre de passage. On limite aux demandes de cette session.
  await Promise.all(ids.slice(0, 100).map((rid, i) =>
    admin.from('requests').update({ queue_position: i + 1 }).eq('id', String(rid)).eq('session_id', params.id)
  ))

  return NextResponse.json({ ok: true })
}
