import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { rateLimit, isValidUuid } from '@/lib/rate-limit'

// POST /api/requests — le client crée une demande
export async function POST(req: NextRequest) {
  // Anti-spam de demandes : 15 créations / minute / IP
  const limited = rateLimit(req, { bucket: 'request', limit: 15, windowMs: 60_000 })
  if (limited) return limited

  const supabase = await createServerSupabaseClient()
  const body = await req.json()

  const {
    session_id,
    customer_name,
    song_name,
    artist,
    album_image,
    request_type,
    message,
    customer_email,
    customer_user_id,
    itunes_url,
  } = body

  if (!session_id || !customer_name || !song_name || !artist) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }
  if (!isValidUuid(session_id)) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 400 })
  }
  // Garde-fous de taille (anti-payload abusif)
  if (String(customer_name).length > 80 || String(song_name).length > 200 ||
      String(artist).length > 200 || (message && String(message).length > 500)) {
    return NextResponse.json({ error: 'Données trop longues' }, { status: 400 })
  }

  // Vérifie que la session est active et récupère le type + prix
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, status, session_type, price_normal, price_priority, price_karaoke, price_karaoke_priority')
    .eq('id', session_id)
    .eq('status', 'active')
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session introuvable ou inactive' }, { status: 404 })
  }

  const isKaraoke = session.session_type === 'karaoke'

  let amount: number
  let finalRequestType: string
  let queuePosition: number | null = null

  if (isKaraoke) {
    const isPriority = body.is_priority === true
    amount = isPriority ? (session.price_karaoke_priority ?? 0) : (session.price_karaoke ?? 0)
    finalRequestType = isPriority ? 'priority' : 'karaoke'

    const admin = createServiceSupabaseClient()

    if (isPriority) {
      // Prioritaire : se place devant toute la file (position min - 1, minimum 0)
      const { data: minRow } = await admin
        .from('requests')
        .select('queue_position')
        .eq('session_id', session_id)
        .in('status', ['pending_payment', 'paid', 'approved'])
        .order('queue_position', { ascending: true })
        .limit(1)
        .single()

      const minPos = minRow?.queue_position ?? 1
      queuePosition = Math.max(0, minPos - 1)
    } else {
      // Normal : se place en fin de file
      const { count } = await admin
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session_id)
        .in('status', ['pending_payment', 'paid', 'approved'])

      queuePosition = (count ?? 0) + 1
    }
  } else {
    finalRequestType = request_type ?? 'normal'
    amount = finalRequestType === 'priority' ? session.price_priority : session.price_normal
  }

  const { data, error } = await supabase
    .from('requests')
    .insert({
      session_id,
      customer_name,
      song_name,
      artist,
      album_image: album_image || null,
      request_type: finalRequestType,
      amount,
      message: message || null,
      status: 'pending_payment',
      queue_position: queuePosition,
      customer_email: customer_email || null,
      customer_user_id: customer_user_id || null,
      itunes_url: itunes_url || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
