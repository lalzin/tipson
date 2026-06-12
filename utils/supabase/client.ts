import { createBrowserClient } from '@supabase/ssr'

// Singleton : une seule instance partagée pour tout l'onglet.
// Évite de multiplier les clients (chacun ouvrant son propre refresh de token
// + listener auth + connexion realtime), ce qui gonflait les requêtes Auth.
let client: ReturnType<typeof createBrowserClient> | undefined

export const createClient = () => {
  if (typeof window === 'undefined') {
    // SSR/prérendu : instance jetable, pas de cache global
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    )
  }
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    )
  }
  return client
}
