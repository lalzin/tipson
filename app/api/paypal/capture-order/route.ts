import { NextRequest, NextResponse } from 'next/server'
import { capturePayPalOrder } from '@/lib/paypal'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { order_id, request_id } = await req.json()
  if (!order_id || !request_id) {
    return NextResponse.json({ error: 'order_id et request_id requis' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Capture le paiement PayPal
  const capture = await capturePayPalOrder(order_id)
  const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id

  if (!captureId) {
    return NextResponse.json({ error: 'Capture échouée' }, { status: 400 })
  }

  // Marque la demande comme payée + stocke le capture ID pour remboursement futur
  const { data, error } = await supabase
    .from('requests')
    .update({
      status: 'paid',
      paypal_capture_id: captureId,
    })
    .eq('id', request_id)
    .eq('status', 'pending_payment')
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Mise à jour échouée' }, { status: 500 })
  }

  return NextResponse.json(data)
}
