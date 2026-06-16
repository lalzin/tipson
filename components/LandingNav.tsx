'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { User, LayoutDashboard, Shield } from 'lucide-react'
import { LogoBadge } from '@/components/Logo'

type State =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'user'; name: string; isDj: boolean; isAdmin: boolean }

export default function LandingNav() {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const supabase = createClient()
    // Lecture locale du token (aucune requête réseau au serveur Auth)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { setState({ status: 'guest' }); return }
      const fallbackName =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.email?.split('@')[0] || 'Mon compte'
      // Un seul appel pour connaître le rôle (DJ/admin) → bon CTA
      try {
        const res = await fetch('/api/profile')
        const p = res.ok ? await res.json() : null
        setState({
          status: 'user',
          name: p?.dj_name || fallbackName,
          isDj: !!p?.is_dj,
          isAdmin: !!p?.is_admin,
        })
      } catch {
        setState({ status: 'user', name: fallbackName, isDj: false, isAdmin: false })
      }
    })
  }, [])

  return (
    <nav className="sticky top-0 z-30 backdrop-blur bg-gray-950/70 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoBadge className="w-9 h-9 shadow-lg shadow-fuchsia-900/40" gradient={['#d946ef', '#22d3ee']} />
          <span className="font-black text-lg tracking-tight">TIPSON</span>
        </Link>

        <div className="flex items-center gap-2">
          {state.status === 'loading' && (
            <div className="w-24 h-9 rounded-xl bg-white/5 animate-pulse" />
          )}

          {state.status === 'guest' && (
            <>
              <Link href="/dj" className="px-3 sm:px-4 py-2 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition">
                Espace DJ
              </Link>
              <Link href="/join" className="px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold bg-white text-gray-950 hover:bg-gray-200 transition">
                Rejoindre
              </Link>
            </>
          )}

          {state.status === 'user' && (
            <>
              {/* Salutation */}
              <span className="hidden sm:inline text-sm text-gray-400 mr-1">
                Bonjour, <span className="text-white font-medium">{state.name}</span>
              </span>

              {state.isAdmin && (
                <Link href="/admin" className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-yellow-300 hover:bg-yellow-500/10 transition">
                  <Shield className="w-4 h-4" /> Admin
                </Link>
              )}

              {(state.isDj || state.isAdmin) ? (
                <Link href="/dj/dashboard" className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white transition">
                  <LayoutDashboard className="w-4 h-4" /> Tableau de bord
                </Link>
              ) : (
                <Link href="/account" className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold bg-white text-gray-950 hover:bg-gray-200 transition">
                  <User className="w-4 h-4" /> Mon compte
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
