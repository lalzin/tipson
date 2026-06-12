import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'
import { resolveMusicLinks, mergeWithSearch } from '@/lib/songlink'
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
    .select('id, itunes_url, music_links, song_name, artist, sessions!inner(dj_id)')
    .eq('id', params.id)
    .single()

  if (!request) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  if ((request as any).sessions.dj_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const song = request.song_name ?? ''
  const artist = request.artist ?? ''

  // Déjà en cache → on garantit quand même les 3 plateformes (fallback recherche)
  if (request.music_links) {
    return NextResponse.json({ links: mergeWithSearch(request.music_links as any, song, artist) })
  }

  // Toujours des liens de recherche au minimum (Spotify inclus), même sans iTunes URL
  if (!request.itunes_url) {
    return NextResponse.json({ links: mergeWithSearch(null, song, artist) })
  }

  const result = await resolveMusicLinks(request.itunes_url)

  // Rate-limit / erreur Odesli → on affiche quand même les liens de recherche
  if ('rateLimited' in result || 'error' in result) {
    return NextResponse.json({ links: mergeWithSearch(null, song, artist), rateLimited: 'rateLimited' in result })
  }

  // Succès → exact (Odesli) complété par la recherche pour les plateformes manquantes (ex. Spotify)
  const merged = mergeWithSearch(result.links, song, artist)
  await admin.from('requests').update({ music_links: result.links }).eq('id', params.id)
  return NextResponse.json({ links: merged })
}
