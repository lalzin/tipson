import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { rateLimit, isValidUuid, getClientIp } from '@/lib/rate-limit'
import { getMaxRequestsPerUser } from '@/lib/platform-settings'
import { bannedGuard } from '@/lib/bans'

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
  const clientId = body.client_id ? String(body.client_id).slice(0, 64) : null

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
    .select('id, status, session_type, price_normal, price_priority, price_karaoke, price_karaoke_priority, price_blacklist, require_login')
    .eq('id', session_id)
    .eq('status', 'active')
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session introuvable ou inactive' }, { status: 404 })
  }

  // Soirée réservée aux comptes connectés
  if (session.require_login && !customer_user_id) {
    return NextResponse.json({ error: 'Cette soirée nécessite un compte pour participer.' }, { status: 403 })
  }

  // Participant banni (appareil / compte / IP) → refus
  const ip = getClientIp(req)
  const banned = await bannedGuard(session_id, { clientId, userId: customer_user_id, ip })
  if (banned) return banned

  const isKaraoke = session.session_type === 'karaoke'

  // Limite de demandes simultanées par utilisateur (hors karaoké : file dédiée).
  // Compte les demandes non terminées (payées/validées) du même user OU client.
  if (!isKaraoke && (customer_user_id || clientId)) {
    const max = await getMaxRequestsPerUser()
    const counter = createServiceSupabaseClient()
    let q = counter
      .from('requests')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session_id)
      .in('status', ['paid', 'approved'])
    if (customer_user_id && clientId) {
      q = q.or(`customer_user_id.eq.${customer_user_id},client_id.eq.${clientId}`)
    } else if (customer_user_id) {
      q = q.eq('customer_user_id', customer_user_id)
    } else {
      q = q.eq('client_id', clientId)
    }
    const { count } = await q
    if ((count ?? 0) >= max) {
      return NextResponse.json(
        { error: `Vous avez déjà ${max} demande${max > 1 ? 's' : ''} en cours. Patientez qu'elles passent avant d'en ajouter.`, limit_reached: true },
        { status: 409 }
      )
    }
  }

  let amount: number
  let finalRequestType: string
  let queuePosition: number | null = null
  let consumedCodeId: string | null = null // pour rollback si l'insertion échoue

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
    // Liste noire : si le morceau y est, on force le type + prix premium
    // (impossible de contourner en demandant 'normal' moins cher).
    let blacklisted = false
    if (body.itunes_id) {
      const admin = createServiceSupabaseClient()
      const { data: bl } = await admin
        .from('blacklist_tracks')
        .select('id')
        .eq('session_id', session_id)
        .eq('itunes_id', String(body.itunes_id))
        .maybeSingle()
      blacklisted = !!bl
    }

    if (blacklisted) {
      finalRequestType = 'blacklist'
      amount = session.price_blacklist ?? 1000
    } else {
      finalRequestType = request_type === 'priority' ? 'priority' : 'normal'
      amount = finalRequestType === 'priority' ? session.price_priority : session.price_normal
    }

    // Anti-doublon (session DJ uniquement) : un même morceau ne peut pas être
    // demandé/joué deux fois. (En karaoké, plusieurs personnes peuvent le chanter.)
    const admin = createServiceSupabaseClient()
    const { data: dup } = await admin
      .from('requests')
      .select('id, status')
      .eq('session_id', session_id)
      .eq('song_name', song_name)
      .eq('artist', artist)
      .in('status', ['paid', 'approved', 'played'])
      .limit(1)
      .maybeSingle()
    if (dup) {
      const word = dup.status === 'played' ? 'a déjà été joué' : 'a déjà été demandé'
      return NextResponse.json({ error: `Ce morceau ${word} dans cette soirée.` }, { status: 409 })
    }

    // Code promo (usage unique) : rend la demande gratuite. Ne s'applique pas aux
    // morceaux en liste noire (tarif premium imposé).
    if (body.promo_code) {
      if (blacklisted) {
        return NextResponse.json({ error: 'Les codes promo ne s\'appliquent pas aux morceaux interdits.' }, { status: 422 })
      }
      const codeNorm = String(body.promo_code).trim().toUpperCase()
      // Consommation atomique : passe used false→true en une seule requête
      const { data: consumed } = await admin
        .from('promo_codes')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('session_id', session_id)
        .eq('code', codeNorm)
        .eq('used', false)
        .select('id')
        .maybeSingle()
      if (!consumed) {
        return NextResponse.json({ error: 'Code promo invalide ou déjà utilisé.' }, { status: 422 })
      }
      consumedCodeId = consumed.id
      amount = 0
    }
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
      client_id: clientId,
      ip,
    })
    .select()
    .single()

  if (error) {
    // Rollback du code promo consommé si l'insertion a échoué
    if (consumedCodeId) {
      const admin = createServiceSupabaseClient()
      await admin.from('promo_codes').update({ used: false, used_at: null }).eq('id', consumedCodeId)
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
