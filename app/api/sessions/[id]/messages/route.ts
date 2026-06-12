import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { rateLimit, isValidUuid } from '@/lib/rate-limit'
import { moderateMessage } from '@/lib/moderation'

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

  const { text, author_name } = await req.json()

  const admin = createServiceSupabaseClient()
  const { data: session } = await admin
    .from('sessions')
    .select('id, status, messages_enabled')
    .eq('id', params.id)
    .single()

  if (!session || session.status !== 'active') {
    return NextResponse.json({ error: 'Session inactive' }, { status: 404 })
  }
  if (!session.messages_enabled) {
    return NextResponse.json({ error: 'Les messages ne sont pas activés pour cette soirée' }, { status: 403 })
  }

  const mod = moderateMessage(text)
  if (!mod.ok) return NextResponse.json({ error: mod.reason }, { status: 422 })

  const { error } = await admin.from('messages').insert({
    session_id: params.id,
    text: String(text).trim(),
    author_name: author_name ? String(author_name).slice(0, 40) : null,
    is_super: false,
    amount: 0,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
