import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'
import { rateLimit, isValidUuid } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// GET — liste noire de la session (lecture publique, pour le client + le DJ)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = rateLimit(req, { bucket: 'blacklist-read', limit: 60, windowMs: 60_000 })
  if (limited) return limited
  if (!isValidUuid(params.id)) return NextResponse.json({ tracks: [] })

  const admin = createServiceSupabaseClient()
  const { data } = await admin
    .from('blacklist_tracks')
    .select('id, itunes_id, name, artist, image')
    .eq('session_id', params.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ tracks: data ?? [] })
}

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

// POST — le DJ ajoute un morceau à la liste noire
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isValidUuid(params.id)) return NextResponse.json({ error: 'Session invalide' }, { status: 400 })
  const guard = await requireDj(params.id)
  if ('error' in guard) return guard.error

  const { itunes_id, name, artist, image } = await req.json()
  if (!itunes_id || !name) return NextResponse.json({ error: 'Morceau invalide' }, { status: 400 })

  const { error } = await guard.admin.from('blacklist_tracks').upsert(
    { session_id: params.id, itunes_id: String(itunes_id), name, artist: artist || '', image: image || null },
    { onConflict: 'session_id,itunes_id' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE ?itunes_id=... — le DJ retire un morceau
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isValidUuid(params.id)) return NextResponse.json({ error: 'Session invalide' }, { status: 400 })
  const guard = await requireDj(params.id)
  if ('error' in guard) return guard.error

  const itunesId = req.nextUrl.searchParams.get('itunes_id')
  if (!itunesId) return NextResponse.json({ error: 'itunes_id requis' }, { status: 400 })

  const { error } = await guard.admin.from('blacklist_tracks')
    .delete().eq('session_id', params.id).eq('itunes_id', itunesId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
