import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET /api/account/stats — KPI du client connecté (ses participations)
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceSupabaseClient()

  // Toutes les demandes de ce client (via user_id)
  const { data: requests } = await admin
    .from('requests')
    .select('id, session_id, song_name, artist, album_image, status, amount, request_type, refunded, created_at')
    .eq('customer_user_id', user.id)
    .order('created_at', { ascending: false })

  const reqs = requests ?? []
  const paid = ['paid', 'approved', 'played']

  // Sessions distinctes
  const sessionIds = Array.from(new Set(reqs.map(r => r.session_id)))
  let sessionMap = new Map<string, { name: string; session_type: string; dj_name: string | null }>()
  if (sessionIds.length > 0) {
    const { data: sessions } = await admin
      .from('sessions')
      .select('id, name, session_type, profiles(dj_name)')
      .in('id', sessionIds)
    sessionMap = new Map((sessions ?? []).map((s: any) => [
      s.id,
      { name: s.name, session_type: s.session_type, dj_name: s.profiles?.dj_name ?? null },
    ]))
  }

  const totalSpent = reqs.filter(r => paid.includes(r.status) && !r.refunded)
    .reduce((sum, r) => sum + (r.amount ?? 0), 0)
  const played = reqs.filter(r => r.status === 'played').length

  // Regroupe par soirée
  const bySession = sessionIds.map(sid => {
    const sessionReqs = reqs.filter(r => r.session_id === sid)
    const info = sessionMap.get(sid)
    return {
      session_id: sid,
      name: info?.name ?? 'Soirée',
      session_type: info?.session_type ?? 'dj',
      dj_name: info?.dj_name ?? null,
      requests: sessionReqs.length,
      spent: sessionReqs.filter(r => paid.includes(r.status) && !r.refunded).reduce((s, r) => s + (r.amount ?? 0), 0),
      lastAt: sessionReqs[0]?.created_at ?? null,
    }
  }).sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''))

  return NextResponse.json({
    kpi: {
      sessions: sessionIds.length,
      requests: reqs.length,
      played,
      totalSpent,
    },
    sessions: bySession,
    recent: reqs.slice(0, 8).map(r => ({
      id: r.id,
      song_name: r.song_name,
      artist: r.artist,
      album_image: r.album_image,
      status: r.status,
      amount: r.amount,
      request_type: r.request_type,
      refunded: r.refunded,
      created_at: r.created_at,
      session_name: sessionMap.get(r.session_id)?.name ?? null,
    })),
  })
}
