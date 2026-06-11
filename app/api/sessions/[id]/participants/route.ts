import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceSupabaseClient()

  // Verify session belongs to this DJ
  const { data: session, error: sessErr } = await admin
    .from('sessions')
    .select('id, dj_id')
    .eq('id', params.id)
    .single()

  if (sessErr || !session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
  if (session.dj_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await admin
    .from('requests')
    .select('customer_email, customer_user_id, customer_name, created_at')
    .eq('session_id', params.id)
    .not('status', 'eq', 'pending_payment')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Deduplicate by email (keep first occurrence), include anonymous users without email
  const seen = new Set<string>()
  const participants: { email: string | null; name: string | null; anonymous: boolean }[] = []

  for (const row of data ?? []) {
    const key = row.customer_email ?? row.customer_user_id ?? row.customer_name
    if (!key || seen.has(key)) continue
    seen.add(key)
    participants.push({
      email: row.customer_email,
      name: row.customer_name,
      anonymous: !row.customer_email,
    })
  }

  return NextResponse.json(participants)
}
