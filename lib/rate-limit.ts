import { NextRequest, NextResponse } from 'next/server'

/**
 * Rate limiter en mémoire (fenêtre glissante simple).
 * Suffisant pour une instance unique. Pour du multi-instance, brancher Redis/Upstash.
 *
 * Conçu pour bloquer les abus (flood de codes, scan d'UUID, spam de demandes)
 * sans gêner un utilisateur normal : les limites sont volontairement larges.
 */

type Bucket = { count: number; resetAt: number }
const store = new Map<string, Bucket>()

// Nettoyage périodique pour éviter une fuite mémoire
let lastSweep = Date.now()
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  store.forEach((b, key) => {
    if (b.resetAt < now) store.delete(key)
  })
}

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

interface LimitOptions {
  /** Identifiant logique du seau (ex: "code", "session", "request") */
  bucket: string
  /** Nombre max de requêtes dans la fenêtre */
  limit: number
  /** Durée de la fenêtre en millisecondes */
  windowMs: number
}

/**
 * Renvoie une NextResponse 429 si la limite est dépassée, sinon null.
 * Usage :
 *   const limited = rateLimit(req, { bucket: 'code', limit: 20, windowMs: 60_000 })
 *   if (limited) return limited
 */
export function rateLimit(req: NextRequest, opts: LimitOptions): NextResponse | null {
  const now = Date.now()
  sweep(now)

  const ip = getClientIp(req)
  const key = `${opts.bucket}:${ip}`
  const existing = store.get(key)

  if (!existing || existing.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs })
    return null
  }

  existing.count++
  if (existing.count > opts.limit) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000)
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans un instant.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }
  return null
}

/** Valide qu'une chaîne est un UUID v4 plausible — rejette les scans malformés sans toucher la BDD. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isValidUuid(v: string | undefined | null): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

/** Valide le format d'un code de soirée (6 caractères alphanumériques majuscules). */
const CODE_RE = /^[A-Z0-9]{6}$/
export function isValidCode(v: string | undefined | null): v is string {
  return typeof v === 'string' && CODE_RE.test(v)
}
