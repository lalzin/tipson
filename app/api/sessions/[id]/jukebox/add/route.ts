import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { rateLimit, isValidUuid } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// POST /api/sessions/[id]/jukebox/add
// Le client ajoute un morceau à la file interne (Supabase). Le dashboard de
// l'établissement (MusicKit JS) lira cette file en Realtime et fera le pont vers
// Apple Music. Le backend ne touche JAMAIS Apple Music.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = rateLimit(req, { bucket: 'jukebox-add', limit: 20, windowMs: 60_000 })
  if (limited) return limited
  if (!isValidUuid(params.id)) return NextResponse.json({ error: 'Session invalide' }, { status: 400 })

  const { track_id, song_name, artist, album_image, author_name } = await req.json()
  if (!track_id || !song_name) return NextResponse.json({ error: 'Morceau invalide' }, { status: 400 })

  const admin = createServiceSupabaseClient()
  const { data: session } = await admin
    .from('sessions')
    .select('id, status, session_type')
    .eq('id', params.id)
    .single()

  if (!session || session.status !== 'active') return NextResponse.json({ error: 'Session inactive' }, { status: 404 })
  if (session.session_type !== 'jukebox') return NextResponse.json({ error: 'Pas une session jukebox' }, { status: 400 })

  // Anti-doublon : pas deux fois le même morceau encore en file
  const { data: dup } = await admin
    .from('requests')
    .select('id')
    .eq('session_id', params.id)
    .eq('spotify_uri', String(track_id))
    .in('status', ['paid', 'approved'])
    .maybeSingle()
  if (dup) return NextResponse.json({ error: 'Ce morceau est déjà dans la file.' }, { status: 409 })

  // Position en fin de file
  const { count } = await admin
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', params.id)
    .in('status', ['paid', 'approved'])
  const queuePosition = (count ?? 0) + 1

  const { data, error } = await admin.from('requests').insert({
    session_id: params.id,
    customer_name: author_name ? String(author_name).slice(0, 40) : 'Quelqu\'un',
    song_name: String(song_name).slice(0, 200),
    artist: artist ? String(artist).slice(0, 200) : '',
    album_image: album_image || null,
    request_type: 'jukebox',
    amount: 0,
    status: 'paid',
    queue_position: queuePosition,
    spotify_uri: String(track_id), // id du morceau (Apple Music ou Spotify)
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
