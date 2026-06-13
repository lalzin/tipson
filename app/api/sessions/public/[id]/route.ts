import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { rateLimit, isValidUuid } from '@/lib/rate-limit'

// Jamais de cache : le statut de session doit toujours être à jour
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Lecture publique d'une session par son UUID — pas d'auth requise.
// Service client : permet de lire les sessions terminées/en pause (le RLS public
// ne laisse lire que les sessions actives), pour afficher le bon message au client.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // Anti-scan d'UUID : 60 lectures / minute / IP (large pour le polling légitime)
  const limited = rateLimit(req, { bucket: 'session', limit: 60, windowMs: 60_000 })
  if (limited) return limited

  // Rejette les UUID malformés sans toucher la BDD
  if (!isValidUuid(params.id)) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
  }

  const supabase = createServiceSupabaseClient()

  const { data, error } = await supabase
    .from('sessions')
    .select('*, profiles(dj_name, paypal_me_url)')
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
  }

  return NextResponse.json(data)
}
