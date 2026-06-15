import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { rateLimit, isValidUuid } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// GET ?code=... — vérifie un code promo SANS le consommer (aperçu côté client).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = rateLimit(req, { bucket: 'promo-validate', limit: 30, windowMs: 60_000 })
  if (limited) return limited
  if (!isValidUuid(params.id)) return NextResponse.json({ valid: false })

  const code = (req.nextUrl.searchParams.get('code') || '').trim().toUpperCase()
  if (!code) return NextResponse.json({ valid: false })

  const admin = createServiceSupabaseClient()
  const { data } = await admin
    .from('promo_codes')
    .select('id, used')
    .eq('session_id', params.id)
    .eq('code', code)
    .maybeSingle()

  if (!data) return NextResponse.json({ valid: false, reason: 'Code inconnu' })
  if (data.used) return NextResponse.json({ valid: false, reason: 'Code déjà utilisé' })
  return NextResponse.json({ valid: true })
}
