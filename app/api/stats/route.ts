import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Sessions du DJ
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('dj_id', user.id)

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ totalRevenue: 0, totalRequests: 0, totalSessions: 0 })
  }

  const sessionIds = sessions.map(s => s.id)

  const { data: requests } = await supabase
    .from('requests')
    .select('amount, status')
    .in('session_id', sessionIds)
    .in('status', ['paid', 'approved', 'played'])

  const totalRevenue = (requests || []).reduce((sum, r) => sum + r.amount, 0)

  return NextResponse.json({
    totalRevenue,
    totalRequests: requests?.length || 0,
    totalSessions: sessions.length,
  })
}
