import { NextRequest, NextResponse } from 'next/server'
import { createPayPalOrder } from '@/lib/paypal'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { request_id } = await req.json()
  if (!request_id) return NextResponse.json({ error: 'request_id requis' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: request, error } = await supabase
    .from('requests')
    .select('id, song_name, artist, amount, status')
    .eq('id', request_id)
    .eq('status', 'pending_payment')
    .single()

  if (error || !request) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  }

  const order = await createPayPalOrder(
    request.amount,
    `TIPSON — ${request.song_name} par ${request.artist}`
  )

  // Stocke l'order ID pour le capturer ensuite
  await supabase
    .from('requests')
    .update({ paypal_order_id: order.id })
    .eq('id', request_id)

  return NextResponse.json({ orderId: order.id })
}
