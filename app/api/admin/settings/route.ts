import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import {
  getPlatformCommission, setPlatformCommission,
  getMaxRequestsPerUser, setMaxRequestsPerUser,
} from '@/lib/platform-settings'

export const dynamic = 'force-dynamic'

// GET /api/admin/settings — réglages plateforme (commission, limite de demandes)
export async function GET() {
  const guard = await requireAdmin()
  if ('error' in guard) return guard.error
  const [commission_percent, max_requests_per_user] = await Promise.all([
    getPlatformCommission(),
    getMaxRequestsPerUser(),
  ])
  return NextResponse.json({ commission_percent, max_requests_per_user })
}

// PATCH /api/admin/settings — met à jour la commission (0–50 %) et/ou la limite (1–20)
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin()
  if ('error' in guard) return guard.error

  const body = await req.json().catch(() => ({}))
  const out: Record<string, number> = {}

  if (body?.commission_percent !== undefined) {
    const raw = Number(body.commission_percent)
    if (!Number.isFinite(raw) || raw < 0 || raw > 50) {
      return NextResponse.json({ error: 'Commission invalide (0 à 50 %)' }, { status: 422 })
    }
    out.commission_percent = await setPlatformCommission(raw)
  }

  if (body?.max_requests_per_user !== undefined) {
    const raw = Number(body.max_requests_per_user)
    if (!Number.isFinite(raw) || raw < 1 || raw > 20) {
      return NextResponse.json({ error: 'Limite invalide (1 à 20)' }, { status: 422 })
    }
    out.max_requests_per_user = await setMaxRequestsPerUser(raw)
  }

  return NextResponse.json(out)
}
