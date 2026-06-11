import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DJ_ID = 'a0000000-0000-0000-0000-000000000001'
const SESSION_ACTIVE  = 'b0000000-0000-0000-0000-000000000001'
const SESSION_PAUSED  = 'b0000000-0000-0000-0000-000000000002'
const SESSION_ENDED   = 'b0000000-0000-0000-0000-000000000003'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local' }, { status: 500 })
  }

  // Admin client — bypasse RLS et peut créer des users
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const errors: string[] = []

  // 1. Crée ou récupère le user DJ test
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const existing = existingUsers?.users?.find(u => u.email === 'dj@test.com')

  let userId = existing?.id

  if (!userId) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: 'dj@test.com',
      password: 'testdj123',
      email_confirm: true,
      user_metadata: { dj_name: 'DJ Shadow' },
    })
    if (createErr) {
      errors.push(`Création user: ${createErr.message}`)
    } else {
      userId = created.user?.id
    }
  } else {
    // Met à jour le mot de passe au cas où
    await admin.auth.admin.updateUserById(existing!.id, {
      password: 'testdj123',
      email_confirm: true,
    })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Impossible de créer le user', errors }, { status: 500 })
  }

  // 2. Profil
  const { error: profileErr } = await admin.from('profiles').upsert({
    id: userId,
    dj_name: 'DJ Shadow',
    paypal_me_url: 'https://paypal.me/djshadowtest',
  })
  if (profileErr) errors.push(`Profile: ${profileErr.message}`)

  // 3. Sessions
  const { error: sessErr } = await admin.from('sessions').upsert([
    {
      id: SESSION_ACTIVE, dj_id: userId,
      name: 'Soirée Rooftop — Vendredi', code: 'TEST01',
      status: 'active', price_normal: 100, price_priority: 500,
      venue: 'Le Rex Club, Paris',
    },
    {
      id: SESSION_PAUSED, dj_id: userId,
      name: 'Club Night Samedi', code: 'TEST02',
      status: 'paused', price_normal: 100, price_priority: 500,
      venue: 'Concrete, Paris',
    },
    {
      id: SESSION_ENDED, dj_id: userId,
      name: 'Anniversaire Julie', code: 'TEST03',
      status: 'ended', price_normal: 100, price_priority: 500,
      venue: 'Salle privée',
    },
  ])
  if (sessErr) errors.push(`Sessions: ${sessErr.message}`)

  // 4. Demandes mock dans TEST01
  const { error: reqErr } = await admin.from('requests').upsert([
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      session_id: SESSION_ACTIVE, customer_name: 'Lucas',
      song_name: 'Blinding Lights', artist: 'The Weeknd',
      album_image: 'https://i.scdn.co/image/ab67616d0000b273ef017e899c0547766997d874',
      request_type: 'priority', status: 'paid', amount: 500,
      message: 'Pour ma copine Camille, son son préféré !!',
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      session_id: SESSION_ACTIVE, customer_name: 'Sarah',
      song_name: 'Levitating', artist: 'Dua Lipa',
      album_image: 'https://i.scdn.co/image/ab67616d0000b273bd26ede1ae69327010d49946',
      request_type: 'normal', status: 'paid', amount: 100,
      message: null,
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      session_id: SESSION_ACTIVE, customer_name: 'Tom',
      song_name: 'One More Time', artist: 'Daft Punk',
      album_image: 'https://i.scdn.co/image/ab67616d00000b2787b0b8d0f5ad4f4a11a9b9f4',
      request_type: 'priority', status: 'paid', amount: 500,
      message: 'CLASSIC !!',
    },
    {
      id: 'c0000000-0000-0000-0000-000000000004',
      session_id: SESSION_ACTIVE, customer_name: 'Emma',
      song_name: 'As It Was', artist: 'Harry Styles',
      album_image: 'https://i.scdn.co/image/ab67616d0000b2732e8ed79e177ff6011076f5f0',
      request_type: 'normal', status: 'approved', amount: 100,
      message: null,
    },
    {
      id: 'c0000000-0000-0000-0000-000000000005',
      session_id: SESSION_ACTIVE, customer_name: 'Alex',
      song_name: 'Roses', artist: 'SAINt JHN',
      request_type: 'priority', status: 'played', amount: 500,
      message: null,
    },
    {
      id: 'c0000000-0000-0000-0000-000000000006',
      session_id: SESSION_ACTIVE, customer_name: 'Marie',
      song_name: 'Gangnam Style', artist: 'PSY',
      request_type: 'normal', status: 'rejected', amount: 100,
      message: 'Ambiance soirée chic svp 🙏',
    },
    // Session terminée — pour les stats
    { id: 'c0000000-0000-0000-0000-000000000010', session_id: SESSION_ENDED, customer_name: 'Paul', song_name: 'Starboy', artist: 'The Weeknd', request_type: 'priority', status: 'played', amount: 500, message: null },
    { id: 'c0000000-0000-0000-0000-000000000011', session_id: SESSION_ENDED, customer_name: 'Clara', song_name: 'Bad Guy', artist: 'Billie Eilish', request_type: 'normal', status: 'played', amount: 100, message: null },
    { id: 'c0000000-0000-0000-0000-000000000012', session_id: SESSION_ENDED, customer_name: 'Hugo', song_name: 'Industry Baby', artist: 'Lil Nas X', request_type: 'priority', status: 'played', amount: 500, message: null },
  ])
  if (reqErr) errors.push(`Requests: ${reqErr.message}`)

  return NextResponse.json({
    ok: errors.length === 0,
    userId,
    errors: errors.length > 0 ? errors : undefined,
    message: errors.length === 0
      ? 'Setup OK — compte dj@test.com / testdj123 prêt'
      : 'Setup partiel — voir errors',
  })
}
