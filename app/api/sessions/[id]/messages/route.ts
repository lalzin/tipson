import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { rateLimit, isValidUuid } from '@/lib/rate-limit'
import { moderateMessage } from '@/lib/moderation'
import { getToxicity, toxicityMessage } from '@/lib/perspective'

export const dynamic = 'force-dynamic'

// GET — derniers messages d'une session (chargement initial de l'écran)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = rateLimit(req, { bucket: 'messages-read', limit: 60, windowMs: 60_000 })
  if (limited) return limited
  if (!isValidUuid(params.id)) return NextResponse.json({ messages: [] })

  const admin = createServiceSupabaseClient()
  const { data } = await admin
    .from('messages')
    .select('id, text, author_name, is_super, amount, created_at')
    .eq('session_id', params.id)
    .order('created_at', { ascending: false })
    .limit(30)

  return NextResponse.json({ messages: (data ?? []).reverse() })
}

// POST — un client envoie un message gratuit (modéré côté serveur)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = rateLimit(req, { bucket: 'messages-send', limit: 10, windowMs: 60_000 })
  if (limited) return limited
  if (!isValidUuid(params.id)) return NextResponse.json({ error: 'Session invalide' }, { status: 400 })

  const { text, author_name, is_super } = await req.json()

  const admin = createServiceSupabaseClient()
  // select('*') → robuste même si certaines colonnes n'existent pas encore
  const { data: session } = await admin
    .from('sessions')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!session || session.status !== 'active') {
    return NextResponse.json({ error: 'Session inactive' }, { status: 404 })
  }

  // Super message gratuit : autorisé seulement si activé ET prix à 0
  if (is_super) {
    if (!session.super_messages_enabled) {
      return NextResponse.json({ error: 'Super-messages désactivés' }, { status: 403 })
    }
    if ((session.price_super_message ?? 200) > 0) {
      return NextResponse.json({ error: 'Paiement requis pour le super message' }, { status: 402 })
    }
  } else if (!session.messages_enabled) {
    return NextResponse.json({ error: 'Les messages ne sont pas activés pour cette soirée' }, { status: 403 })
  }

  const raw = String(text || '').trim()
  if (!raw) return NextResponse.json({ error: 'Message vide' }, { status: 422 })
  if (raw.length > 140) return NextResponse.json({ error: 'Message trop long (140 max)' }, { status: 422 })
  if (/(https?:\/\/|www\.)/i.test(raw)) return NextResponse.json({ error: 'Les liens ne sont pas autorisés' }, { status: 422 })

  // Modération : Perspective API (toxicité), repli sur le dictionnaire si indispo
  const threshold = (session.toxicity_threshold ?? 70) / 100
  const score = await getToxicity(raw)
  if (score !== null) {
    if (score >= threshold) return NextResponse.json({ error: toxicityMessage(score), toxicity: score }, { status: 422 })
  } else {
    const mod = moderateMessage(raw)
    if (!mod.ok) return NextResponse.json({ error: mod.reason }, { status: 422 })
  }

  const { error } = await admin.from('messages').insert({
    session_id: params.id,
    text: raw,
    author_name: author_name ? String(author_name).slice(0, 40) : null,
    is_super: !!is_super,
    amount: 0,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
