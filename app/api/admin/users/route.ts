import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { createServiceSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET /api/admin/users — liste tous les profils (admin uniquement)
export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!auth.profile.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createServiceSupabaseClient()
  const [profilesRes, sessionsRes, requestsRes] = await Promise.all([
    admin.from('profiles').select('id, dj_name, is_dj, is_admin, created_at').order('created_at', { ascending: false }),
    admin.from('sessions').select('id, dj_id'),
    admin.from('requests').select('amount, status, session_id'),
  ])

  if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 500 })

  const sessions = sessionsRes.data ?? []
  const requests = requestsRes.data ?? []
  const paid = ['paid', 'approved', 'played']

  // session_id → dj_id
  const sessionDj = new Map(sessions.map(s => [s.id, s.dj_id]))
  // dj_id → nb sessions
  const sessionCount = new Map<string, number>()
  sessions.forEach(s => sessionCount.set(s.dj_id, (sessionCount.get(s.dj_id) ?? 0) + 1))
  // dj_id → revenu
  const revenueByDj = new Map<string, number>()
  requests.forEach(r => {
    if (!paid.includes(r.status)) return
    const dj = sessionDj.get(r.session_id)
    if (!dj) return
    revenueByDj.set(dj, (revenueByDj.get(dj) ?? 0) + (r.amount ?? 0))
  })

  // Récupère les emails depuis auth.users (service role)
  const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailById = new Map((usersList?.users ?? []).map(u => [u.id, u.email]))

  const enriched = (profilesRes.data ?? []).map(p => ({
    ...p,
    email: emailById.get(p.id) ?? null,
    sessionCount: sessionCount.get(p.id) ?? 0,
    revenue: revenueByDj.get(p.id) ?? 0,
  }))
  return NextResponse.json(enriched)
}

// PATCH /api/admin/users — modifie les droits d'un utilisateur (admin uniquement)
export async function PATCH(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!auth.profile.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { user_id, is_dj, is_admin } = body
  if (!user_id) return NextResponse.json({ error: 'user_id requis' }, { status: 400 })

  // Empêche un admin de se retirer lui-même ses propres droits admin (anti lock-out)
  if (user_id === auth.userId && is_admin === false) {
    return NextResponse.json({ error: 'Vous ne pouvez pas retirer vos propres droits admin.' }, { status: 400 })
  }

  const updates: Record<string, boolean> = {}
  if (typeof is_dj === 'boolean') updates.is_dj = is_dj
  if (typeof is_admin === 'boolean') updates.is_admin = is_admin
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune modification' }, { status: 400 })
  }

  const admin = createServiceSupabaseClient()
  const { data, error } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', user_id)
    .select('id, dj_name, is_dj, is_admin, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Promotion en DJ → crée son compte Connect dès maintenant (best-effort).
  // L'organisateur n'aura plus qu'à compléter l'onboarding pour ses versements.
  if (updates.is_dj === true) {
    try {
      const { data: { user } } = await admin.auth.admin.getUserById(user_id)
      if (user?.email) {
        const { ensureConnectAccount } = await import('@/lib/connect')
        await ensureConnectAccount({ userId: user_id, email: user.email, displayName: (data as any).dj_name })
      }
    } catch (e) {
      console.error('Création compte Connect à la promotion DJ échouée (non bloquant):', e)
    }
  }

  return NextResponse.json(data)
}
