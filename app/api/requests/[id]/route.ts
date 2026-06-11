import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { refundPayPalCapture } from '@/lib/paypal'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { status } = body

  const allowed = ['paid', 'approved', 'rejected', 'played']
  if (!status || !allowed.includes(status)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Le client confirme son paiement (pending_payment → paid)
  if (status === 'paid') {
    const { data, error } = await admin
      .from('requests')
      .update({ status: 'paid' })
      .eq('id', params.id)
      .eq('status', 'pending_payment')
      .select()
      .single()

    if (error || !data) return NextResponse.json({ error: 'Impossible de mettre à jour' }, { status: 400 })
    return NextResponse.json(data)
  }

  // Actions DJ — vérifie l'auth
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Récupère la demande avec capture PayPal
  const { data: request, error: fetchErr } = await admin
    .from('requests')
    .select('*, sessions!inner(dj_id)')
    .eq('id', params.id)
    .single()

  if (fetchErr || !request) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  if ((request as any).sessions.dj_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Remboursement automatique si le DJ refuse
  let refunded = false
  if (status === 'rejected' && request.paypal_capture_id) {
    try {
      await refundPayPalCapture(request.paypal_capture_id, request.amount)
      refunded = true
    } catch (err) {
      console.error('PayPal refund error:', err)
      // On continue quand même — marque refusée sans remboursement
    }
  }

  const { data: updated, error: updateErr } = await admin
    .from('requests')
    .update({ status, ...(refunded && { refunded: true }) })
    .eq('id', params.id)
    .select()
    .single()

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  return NextResponse.json({ ...updated, refunded })
}
