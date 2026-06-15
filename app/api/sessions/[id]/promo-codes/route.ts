import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'
import { isValidUuid } from '@/lib/rate-limit'
import { generateSessionCode } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function requireDj(sessionId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const admin = createServiceSupabaseClient()
  const { data: session } = await admin.from('sessions').select('dj_id').eq('id', sessionId).single()
  if (!session) return { error: NextResponse.json({ error: 'Session introuvable' }, { status: 404 }) }
  if (session.dj_id !== user.id) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { admin }
}

// GET — liste des codes promo de la session (DJ uniquement)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isValidUuid(params.id)) return NextResponse.json({ codes: [] })
  const guard = await requireDj(params.id)
  if ('error' in guard) return guard.error

  const { data } = await guard.admin
    .from('promo_codes')
    .select('id, code, used, used_at, created_at')
    .eq('session_id', params.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ codes: data ?? [] })
}

// POST { count } — génère un lot de codes à usage unique (DJ uniquement)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isValidUuid(params.id)) return NextResponse.json({ error: 'Session invalide' }, { status: 400 })
  const guard = await requireDj(params.id)
  if ('error' in guard) return guard.error

  const { count } = await req.json()
  const n = Math.max(1, Math.min(100, Number(count) || 20))

  // Génère des codes uniques (en évitant les doublons dans le lot)
  const codes = new Set<string>()
  while (codes.size < n) codes.add('PR' + generateSessionCode().slice(0, 5))

  const rows = Array.from(codes).map(code => ({ session_id: params.id, code }))
  const { error } = await guard.admin.from('promo_codes').upsert(rows, { onConflict: 'session_id,code', ignoreDuplicates: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, created: rows.length })
}

// DELETE ?id=... — supprime un code (DJ)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isValidUuid(params.id)) return NextResponse.json({ error: 'Session invalide' }, { status: 400 })
  const guard = await requireDj(params.id)
  if ('error' in guard) return guard.error

  const codeId = req.nextUrl.searchParams.get('codeId')
  if (!codeId) return NextResponse.json({ error: 'codeId requis' }, { status: 400 })
  await guard.admin.from('promo_codes').delete().eq('id', codeId).eq('session_id', params.id)
  return NextResponse.json({ ok: true })
}
