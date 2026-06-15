import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { isValidUuid } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/sessions/[id]/wall — mur de votes public : demandes en attente,
// triées par nombre de likes (la foule décide). Aucune donnée personnelle.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isValidUuid(params.id)) return NextResponse.json({ tracks: [] })

  const admin = createServiceSupabaseClient()
  const { data } = await admin
    .from('requests')
    .select('id, song_name, artist, album_image, request_type, status, votes')
    .eq('session_id', params.id)
    .in('status', ['paid', 'approved'])
    .neq('request_type', 'tip')
    .order('votes', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(40)

  return NextResponse.json({ tracks: data ?? [] })
}
