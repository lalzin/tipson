import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { rateLimit, isValidUuid } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// POST /api/sessions/[id]/jukebox/add
// Le client ajoute un morceau à la file interne (Supabase). Le dashboard de
// l'établissement (MusicKit JS) lira cette file en Realtime et fera le pont vers
// Apple Music. Le backend ne touche JAMAIS Apple Music.
//
// Tarification (réutilise les colonnes existantes de la session) :
//   - price_normal   : ajouter à la file (fin de file → playLater)
//   - price_priority : express « passer devant » (joué ensuite → playNext)
// Si le montant est 0 → demande directement en file ('paid').
// Sinon → 'pending_payment' (le client paie ensuite via Stripe, puis PATCH 'paid').
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = rateLimit(req, { bucket: 'jukebox-add', limit: 20, windowMs: 60_000 })
  if (limited) return limited
  if (!isValidUuid(params.id)) return NextResponse.json({ error: 'Session invalide' }, { status: 400 })

  const { track_id, song_name, artist, album_image, author_name, is_priority,
          customer_email, customer_user_id } = await req.json()
  if (!track_id || !song_name) return NextResponse.json({ error: 'Morceau invalide' }, { status: 400 })

  const admin = createServiceSupabaseClient()
  const { data: session } = await admin
    .from('sessions')
    .select('id, status, session_type, price_normal, price_priority, express_enabled')
    .eq('id', params.id)
    .single()

  if (!session || session.status !== 'active') return NextResponse.json({ error: 'Session inactive' }, { status: 404 })
  if (session.session_type !== 'jukebox') return NextResponse.json({ error: 'Pas une session jukebox' }, { status: 400 })

  // Express seulement si activé et qu'un tarif prioritaire est défini
  const expressAllowed = session.express_enabled !== false && (session.price_priority ?? 0) > 0
  const priority = is_priority === true && expressAllowed
  const amount = priority ? (session.price_priority ?? 0) : (session.price_normal ?? 0)

  // Anti-doublon : pas deux fois le même morceau encore en file
  const { data: dup } = await admin
    .from('requests')
    .select('id')
    .eq('session_id', params.id)
    .eq('spotify_uri', String(track_id))
    .in('status', ['pending_payment', 'paid', 'approved'])
    .maybeSingle()
  if (dup) return NextResponse.json({ error: 'Ce morceau est déjà dans la file.' }, { status: 409 })

  // Position : prioritaire en tête, sinon en fin de file
  let queuePosition: number
  if (priority) {
    const { data: minRow } = await admin
      .from('requests')
      .select('queue_position')
      .eq('session_id', params.id)
      .in('status', ['pending_payment', 'paid', 'approved'])
      .order('queue_position', { ascending: true })
      .limit(1)
      .maybeSingle()
    queuePosition = Math.max(0, (minRow?.queue_position ?? 1) - 1)
  } else {
    const { count } = await admin
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', params.id)
      .in('status', ['pending_payment', 'paid', 'approved'])
    queuePosition = (count ?? 0) + 1
  }

  const { data, error } = await admin.from('requests').insert({
    session_id: params.id,
    customer_name: author_name ? String(author_name).slice(0, 40) : 'Quelqu\'un',
    song_name: String(song_name).slice(0, 200),
    artist: artist ? String(artist).slice(0, 200) : '',
    album_image: album_image || null,
    request_type: priority ? 'priority' : 'jukebox',
    amount,
    status: amount > 0 ? 'pending_payment' : 'paid',
    queue_position: queuePosition,
    spotify_uri: String(track_id), // id du morceau (Apple Music ou Spotify)
    customer_email: customer_email || null,
    customer_user_id: customer_user_id || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
