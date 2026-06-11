import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { createServiceSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET /api/admin/stats — métriques globales de la plateforme (admin uniquement)
export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!auth.profile.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createServiceSupabaseClient()

  const [profilesRes, sessionsRes, requestsRes] = await Promise.all([
    admin.from('profiles').select('id, is_dj, is_admin, created_at'),
    admin.from('sessions').select('id, dj_id, status, session_type, created_at'),
    admin.from('requests').select('id, status, amount, refunded, created_at, request_type'),
  ])

  const profiles = profilesRes.data ?? []
  const sessions = sessionsRes.data ?? []
  const requests = requestsRes.data ?? []

  const paidStatuses = ['paid', 'approved', 'played']
  const paidRequests = requests.filter(r => paidStatuses.includes(r.status))
  const revenue = paidRequests.reduce((sum, r) => sum + (r.amount ?? 0), 0)
  const refundedAmount = requests
    .filter(r => r.refunded)
    .reduce((sum, r) => sum + (r.amount ?? 0), 0)

  // Inscriptions sur les 7 derniers jours
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const newUsers7d = profiles.filter(p => new Date(p.created_at).getTime() > weekAgo).length
  const newSessions7d = sessions.filter(s => new Date(s.created_at).getTime() > weekAgo).length

  // Activité par jour (14 derniers jours) — demandes payées
  const days: { date: string; revenue: number; requests: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const start = d.getTime()
    const end = start + 24 * 60 * 60 * 1000
    const dayReqs = paidRequests.filter(r => {
      const t = new Date(r.created_at).getTime()
      return t >= start && t < end
    })
    days.push({
      date: d.toISOString().slice(0, 10),
      revenue: dayReqs.reduce((s, r) => s + (r.amount ?? 0), 0),
      requests: dayReqs.length,
    })
  }

  return NextResponse.json({
    users: {
      total: profiles.length,
      djs: profiles.filter(p => p.is_dj).length,
      admins: profiles.filter(p => p.is_admin).length,
      pending: profiles.filter(p => !p.is_dj && !p.is_admin).length,
      new7d: newUsers7d,
    },
    sessions: {
      total: sessions.length,
      active: sessions.filter(s => s.status === 'active').length,
      paused: sessions.filter(s => s.status === 'paused').length,
      ended: sessions.filter(s => s.status === 'ended').length,
      dj: sessions.filter(s => s.session_type === 'dj').length,
      karaoke: sessions.filter(s => s.session_type === 'karaoke').length,
      new7d: newSessions7d,
    },
    requests: {
      total: requests.length,
      paid: paidRequests.length,
      refunded: requests.filter(r => r.refunded).length,
      priority: paidRequests.filter(r => r.request_type === 'priority').length,
    },
    revenue: {
      gross: revenue,
      refunded: refundedAmount,
      net: revenue - refundedAmount,
      avgPerRequest: paidRequests.length ? Math.round(revenue / paidRequests.length) : 0,
    },
    daily: days,
  })
}
