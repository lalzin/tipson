import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { rateLimit, isValidUuid } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// POST /api/requests/[id]/vote — un participant « like » une demande en attente.
// Un seul vote par appareil (client_id) et par demande.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = rateLimit(req, { bucket: 'vote', limit: 40, windowMs: 60_000 })
  if (limited) return limited
  if (!isValidUuid(params.id)) return NextResponse.json({ error: 'Demande invalide' }, { status: 400 })

  const { client_id } = await req.json().catch(() => ({}))
  const clientId = client_id ? String(client_id).slice(0, 64) : null
  if (!clientId) return NextResponse.json({ error: 'client_id requis' }, { status: 400 })

  const admin = createServiceSupabaseClient()

  // La demande doit exister et être en attente/validée (votable)
  const { data: request } = await admin
    .from('requests')
    .select('id, status, session_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!request || !['paid', 'approved'].includes(request.status)) {
    return NextResponse.json({ error: 'Demande non votable' }, { status: 409 })
  }

  // Enregistre le vote (ignore le doublon)
  const { error: voteErr } = await admin
    .from('request_votes')
    .insert({ request_id: params.id, client_id: clientId })
  const alreadyVoted = voteErr?.code === '23505' // unique_violation

  // Recompte et met à jour le compteur dénormalisé (déclenche le realtime)
  const { count } = await admin
    .from('request_votes')
    .select('*', { count: 'exact', head: true })
    .eq('request_id', params.id)
  const votes = count ?? 0
  await admin.from('requests').update({ votes }).eq('id', params.id)

  return NextResponse.json({ votes, voted: true, alreadyVoted })
}
