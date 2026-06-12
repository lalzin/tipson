import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'
import { resolveMusicLinks } from '@/lib/songlink'
import { isValidUuid } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/requests/[id]/music-links — liens Deezer/Apple/Spotify pour une demande (DJ).
// Résultat mis en cache en base (un seul appel Odesli par morceau).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isValidUuid(params.id)) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceSupabaseClient()
  const { data: request } = await admin
    .from('requests')
    .select('id, itunes_url, music_links, sessions!inner(dj_id)')
    .eq('id', params.id)
    .single()

  if (!request) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  if ((request as any).sessions.dj_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Déjà en cache → on renvoie directement (aucun appel Odesli)
  if (request.music_links) return NextResponse.json({ links: request.music_links })

  // Pas d'URL iTunes (ancienne demande) → rien à résoudre
  if (!request.itunes_url) return NextResponse.json({ links: null })

  const result = await resolveMusicLinks(request.itunes_url)

  // Trop de requêtes → on n'affiche pas les liens (et on ne met rien en cache)
  if ('rateLimited' in result) return NextResponse.json({ links: null, rateLimited: true })
  if ('error' in result) return NextResponse.json({ links: null })

  // Succès → on cache en base pour ne plus jamais rappeler Odesli pour ce morceau
  await admin.from('requests').update({ music_links: result.links }).eq('id', params.id)
  return NextResponse.json({ links: result.links })
}
