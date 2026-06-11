import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'
import type { Profile } from '@/types'

export interface AuthContext {
  userId: string
  profile: Profile
}

/**
 * Récupère l'utilisateur connecté + son profil (avec rôles).
 * Renvoie null si non authentifié.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createServiceSupabaseClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null
  return { userId: user.id, profile: profile as Profile }
}
