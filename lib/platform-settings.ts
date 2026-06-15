import { createServiceSupabaseClient } from '@/lib/supabase-server'

// Commission plateforme prélevée sur chaque paiement (en %).
// Stockée en base (table singleton platform_settings, id=1), éditable par l'admin.
// Repli sur la variable d'environnement puis 10 % si la base est indisponible.
const DEFAULT_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 10)

let cache: { value: number; at: number } | null = null
const TTL = 60_000 // 1 min : évite de requêter la base à chaque paiement

function clamp(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_PERCENT
  return Math.max(0, Math.min(50, Math.round(n * 100) / 100))
}

export async function getPlatformCommission(): Promise<number> {
  if (cache && Date.now() - cache.at < TTL) return cache.value
  try {
    const admin = createServiceSupabaseClient()
    const { data } = await admin
      .from('platform_settings')
      .select('commission_percent')
      .eq('id', 1)
      .maybeSingle()
    const value = data?.commission_percent != null ? clamp(Number(data.commission_percent)) : DEFAULT_PERCENT
    cache = { value, at: Date.now() }
    return value
  } catch {
    return DEFAULT_PERCENT
  }
}

export async function setPlatformCommission(percent: number): Promise<number> {
  const value = clamp(percent)
  const admin = createServiceSupabaseClient()
  await admin
    .from('platform_settings')
    .upsert({ id: 1, commission_percent: value, updated_at: new Date().toISOString() })
  cache = { value, at: Date.now() }
  return value
}

// ── Nombre max de demandes simultanées (non jouées/refusées) par utilisateur ──
const DEFAULT_MAX_REQUESTS = Number(process.env.MAX_REQUESTS_PER_USER ?? 2)
let maxCache: { value: number; at: number } | null = null

function clampMax(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_MAX_REQUESTS
  return Math.max(1, Math.min(20, Math.round(n)))
}

export async function getMaxRequestsPerUser(): Promise<number> {
  if (maxCache && Date.now() - maxCache.at < TTL) return maxCache.value
  try {
    const admin = createServiceSupabaseClient()
    const { data } = await admin
      .from('platform_settings')
      .select('max_requests_per_user')
      .eq('id', 1)
      .maybeSingle()
    const value = data?.max_requests_per_user != null ? clampMax(Number(data.max_requests_per_user)) : DEFAULT_MAX_REQUESTS
    maxCache = { value, at: Date.now() }
    return value
  } catch {
    return DEFAULT_MAX_REQUESTS
  }
}

export async function setMaxRequestsPerUser(n: number): Promise<number> {
  const value = clampMax(n)
  const admin = createServiceSupabaseClient()
  await admin
    .from('platform_settings')
    .upsert({ id: 1, max_requests_per_user: value, updated_at: new Date().toISOString() })
  maxCache = { value, at: Date.now() }
  return value
}
