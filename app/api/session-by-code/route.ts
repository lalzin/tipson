import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { rateLimit, isValidCode } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  // Anti brute-force sur les codes : 30 essais / minute / IP
  const limited = rateLimit(req, { bucket: 'code', limit: 30, windowMs: 60_000 })
  if (limited) return limited

  const code = req.nextUrl.searchParams.get('code')
  // Valide le format avant toute requête BDD (rejette le scan de codes)
  if (!isValidCode(code?.toUpperCase())) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
  }

  // Service client : trouve la session même terminée/en pause pour rediriger
  // vers la page qui affichera le bon message.
  const supabase = createServiceSupabaseClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('id, name, code, status, price_normal, price_priority, venue, profiles(dj_name, paypal_me_url)')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
  }

  return NextResponse.json(data)
}
