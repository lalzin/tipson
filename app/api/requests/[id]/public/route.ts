import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { rateLimit, isValidUuid } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Lecture publique d'une demande — utilisée pour restaurer le tracking après refresh
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = rateLimit(req, { bucket: 'request-read', limit: 60, windowMs: 60_000 })
  if (limited) return limited
  if (!isValidUuid(params.id)) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const admin = createServiceSupabaseClient()

  const { data, error } = await admin
    .from('requests')
    .select('id, song_name, artist, album_image, request_type, status, amount, message, refunded, session_id')
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  return NextResponse.json(data)
}
