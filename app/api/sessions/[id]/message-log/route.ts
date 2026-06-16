import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET /api/sessions/[id]/message-log — messages récents avec IP/identité (DJ).
// Sert au DJ à modérer et bannir un participant depuis ses messages.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session } = await supabase
    .from('sessions').select('id').eq('id', params.id).eq('dj_id', user.id).single()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createServiceSupabaseClient()
  const { data: messages } = await admin
    .from('messages')
    .select('id, text, author_name, is_super, ip, client_id, user_id, created_at')
    .eq('session_id', params.id)
    .order('created_at', { ascending: false })
    .limit(60)

  // Marque les messages dont l'auteur est déjà banni
  const { data: bans } = await admin
    .from('session_bans').select('client_id, user_id').eq('session_id', params.id)
  const bannedClients = new Set((bans ?? []).map(b => b.client_id).filter(Boolean))
  const bannedUsers = new Set((bans ?? []).map(b => b.user_id).filter(Boolean))

  const out = (messages ?? []).map(m => ({
    ...m,
    banned: (m.client_id && bannedClients.has(m.client_id)) || (m.user_id && bannedUsers.has(m.user_id)),
  }))

  return NextResponse.json({ messages: out })
}
