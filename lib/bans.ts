import { NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'

// Vérifie si un participant est banni d'une session.
//  - Bannissement par appareil (client_id) et par compte (user_id) : toujours actif.
//  - Bannissement par IP : UNIQUEMENT si block_ip est vrai sur le ban, car en
//    lieu (WiFi partagé) tous les invités partagent la même IP publique →
//    bloquer l'IP par défaut bannirait toute la salle.
export async function isBanned(
  sessionId: string,
  who: { clientId?: string | null; userId?: string | null; ip?: string | null },
): Promise<boolean> {
  if (!who.clientId && !who.userId && !who.ip) return false
  const admin = createServiceSupabaseClient()
  const { data } = await admin
    .from('session_bans')
    .select('client_id, user_id, ip, block_ip')
    .eq('session_id', sessionId)
  if (!data?.length) return false
  return data.some(b =>
    (who.clientId && b.client_id && b.client_id === who.clientId) ||
    (who.userId && b.user_id && b.user_id === who.userId) ||
    (who.ip && b.block_ip && b.ip && b.ip === who.ip)
  )
}

const BANNED_RESPONSE = NextResponse.json(
  { error: 'Vous ne pouvez plus participer à cette soirée.', banned: true },
  { status: 403 },
)

/** Retourne une réponse 403 si banni, sinon null. */
export async function bannedGuard(
  sessionId: string,
  who: { clientId?: string | null; userId?: string | null; ip?: string | null },
): Promise<NextResponse | null> {
  return (await isBanned(sessionId, who)) ? BANNED_RESPONSE : null
}
