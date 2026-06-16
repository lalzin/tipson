import { stripe, createConnectAccount } from '@/lib/stripe'
import { createServiceSupabaseClient } from '@/lib/supabase-server'

/**
 * Garantit un compte Connect « recipient » VALIDE pour un DJ et le persiste.
 *
 * Réutilise l'ID stocké uniquement s'il est :
 *   - accessible par la clé API actuelle (sinon : permission denied / no such account),
 *   - et a bien la configuration « recipient » appliquée (sinon ex. ancien compte
 *     merchant/express ou compte V1 legacy → incompatible avec nos account_links).
 * Dans tous les autres cas, il crée un compte neuf et l'enregistre. Idempotent.
 */
export async function ensureConnectAccount(opts: {
  userId: string
  email: string
  displayName?: string
}): Promise<string> {
  const admin = createServiceSupabaseClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', opts.userId)
    .single()
  const existing = profile?.stripe_account_id

  if (existing) {
    try {
      const acct: any = await stripe.v2.core.accounts.retrieve(existing, { include: ['configuration.recipient'] })
      const hasRecipient = Array.isArray(acct?.applied_configurations)
        ? acct.applied_configurations.includes('recipient')
        : !!acct?.configuration?.recipient
      if (hasRecipient) return existing // compte valide → on le garde
    } catch {
      // inaccessible (créé avec d'autres clés), supprimé, ou V1 → on recrée
    }
  }

  const account = await createConnectAccount(opts.email, opts.displayName)
  await admin
    .from('profiles')
    .update({ stripe_account_id: account.id, charges_enabled: false, payouts_enabled: false })
    .eq('id', opts.userId)
  return account.id
}
