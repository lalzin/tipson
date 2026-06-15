import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET /api/sessions/[id]/stats — statistiques post-soirée (DJ propriétaire).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session } = await supabase
    .from('sessions')
    .select('id, name, created_at')
    .eq('id', params.id)
    .eq('dj_id', user.id)
    .single()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: reqs } = await supabase
    .from('requests')
    .select('song_name, artist, amount, status, request_type, votes, created_at')
    .eq('session_id', params.id)

  const all = reqs ?? []
  // Revenus = paiements réellement encaissés (validés/joués + pourboires)
  const earning = all.filter(r => ['approved', 'played'].includes(r.status))
  const revenue = earning.reduce((s, r) => s + (r.amount || 0), 0)
  const tips = all.filter(r => r.request_type === 'tip')
  const tipsTotal = tips.reduce((s, r) => s + (r.amount || 0), 0)

  // Sons les plus demandés (hors pourboires)
  const byTrack = new Map<string, { song: string; artist: string; count: number; revenue: number; votes: number }>()
  for (const r of all) {
    if (r.request_type === 'tip') continue
    const key = `${r.song_name}__${r.artist}`
    const cur = byTrack.get(key) || { song: r.song_name, artist: r.artist, count: 0, revenue: 0, votes: 0 }
    cur.count++
    cur.revenue += r.amount || 0
    cur.votes = Math.max(cur.votes, r.votes || 0)
    byTrack.set(key, cur)
  }
  const topTracks = Array.from(byTrack.values()).sort((a, b) => b.count - a.count || b.votes - a.votes).slice(0, 10)

  // Activité par heure (heure locale serveur) → repère l'heure de pic
  const byHour = new Array(24).fill(0)
  for (const r of all) {
    if (r.request_type === 'tip') continue
    const h = new Date(r.created_at).getHours()
    byHour[h]++
  }
  const peakHour = byHour.indexOf(Math.max(...byHour))

  return NextResponse.json({
    session: { name: session.name, created_at: session.created_at },
    totals: {
      revenue,
      tipsTotal,
      tipsCount: tips.length,
      requests: all.filter(r => r.request_type !== 'tip').length,
      played: all.filter(r => r.status === 'played').length,
      rejected: all.filter(r => r.status === 'rejected').length,
    },
    topTracks,
    byHour,
    peakHour,
  })
}
