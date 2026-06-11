import { NextRequest, NextResponse } from 'next/server'
import { refundPayPalCapture } from '@/lib/paypal'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  // Vérifie que c'est bien le DJ connecté
  const supabaseAuth = await createServerSupabaseClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { request_id } = await req.json()

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Récupère la demande avec le capture ID PayPal
  const { data: request, error } = await admin
    .from('requests')
    .select('id, amount, paypal_capture_id, status, sessions!inner(dj_id)')
    .eq('id', request_id)
    .single()

  if (error || !request) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  }

  // Vérifie que la session appartient au DJ
  if ((request as any).sessions.dj_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!request.paypal_capture_id) {
    return NextResponse.json({ error: 'Aucun paiement PayPal associé à rembourser' }, { status: 400 })
  }

  // Lance le remboursement PayPal
  await refundPayPalCapture(request.paypal_capture_id, request.amount)

  // Marque comme refusée + remboursée
  const { data: updated } = await admin
    .from('requests')
    .update({ status: 'rejected', refunded: true })
    .eq('id', request_id)
    .select()
    .single()

  return NextResponse.json(updated)
}
