import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getPlatformCommission, setPlatformCommission } from '@/lib/platform-settings'

export const dynamic = 'force-dynamic'

// GET /api/admin/settings — lit les réglages plateforme (commission)
export async function GET() {
  const guard = await requireAdmin()
  if ('error' in guard) return guard.error
  const commission_percent = await getPlatformCommission()
  return NextResponse.json({ commission_percent })
}

// PATCH /api/admin/settings — met à jour la commission plateforme (0–50 %)
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin()
  if ('error' in guard) return guard.error

  const body = await req.json().catch(() => ({}))
  const raw = Number(body?.commission_percent)
  if (!Number.isFinite(raw) || raw < 0 || raw > 50) {
    return NextResponse.json({ error: 'Commission invalide (0 à 50 %)' }, { status: 422 })
  }
  const commission_percent = await setPlatformCommission(raw)
  return NextResponse.json({ commission_percent })
}
