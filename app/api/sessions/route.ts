import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateSessionCode } from '@/lib/utils'
import { getAuthContext } from '@/lib/auth'

// GET /api/sessions — liste des sessions du DJ connecté
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('dj_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/sessions — crée une nouvelle session (réservé aux DJ approuvés)
export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!auth.profile.is_dj && !auth.profile.is_admin) {
    return NextResponse.json(
      { error: 'Votre compte n\'est pas autorisé à créer des soirées. Contactez un administrateur.' },
      { status: 403 }
    )
  }
  const supabase = await createServerSupabaseClient()
  const user = { id: auth.userId }

  const body = await req.json()
  const { name, venue, session_type = 'dj', price_normal = 100, price_priority = 500, price_karaoke = 0, price_karaoke_priority = 0 } = body

  if (!name || String(name).length > 120) return NextResponse.json({ error: 'name invalide' }, { status: 400 })

  // Génère un code unique
  let code = generateSessionCode()
  let attempts = 0
  while (attempts < 5) {
    const { data: existing } = await supabase.from('sessions').select('id').eq('code', code).single()
    if (!existing) break
    code = generateSessionCode()
    attempts++
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({ dj_id: user.id, name, code, venue, session_type, price_normal, price_priority, price_karaoke, price_karaoke_priority })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
