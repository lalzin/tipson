'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { LogoBadge } from '@/components/Logo'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

// Page de relais pour l'app desktop (TIPSON Studio). Même design que l'espace
// organisateur. L'app ouvre cette page → login (Google/email) → renvoi de la
// session à l'app via le deep-link tipson://.
export default function DesktopAuthPage() {
  const [stage, setStage] = useState<'loading' | 'login' | 'done'>('loading')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // cb = URL loopback fournie par l'app desktop (http://127.0.0.1:PORT/cb).
  // Si absente, on retombe sur le deep-link tipson://.
  function getCb(): string | null {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('cb')
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) handoff(data.session)
      else setStage('login')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session) handoff(session) })
    return () => sub.subscription.unsubscribe()
  }, [])

  function handoff(session: Session) {
    setStage('done')
    const frag = `#access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}`
    const cb = getCb()
    window.location.href = cb ? `${cb}${frag}` : `tipson://auth${frag}`
  }

  async function handleGoogle() {
    setError(''); setGoogleLoading(true)
    const supabase = createClient()
    // Préserve cb à travers le round-trip OAuth
    const cb = getCb()
    const redirectTo = `${window.location.origin}/desktop-auth${cb ? `?cb=${encodeURIComponent(cb)}` : ''}`
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.session) handoff(data.session)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950">
      <div className="w-full max-w-md space-y-7">
        <div className="text-center space-y-4">
          <LogoBadge className="w-20 h-20 mx-auto" rounded={26} gradient={['#9333ea', '#db2777']} />
          <div>
            <h1 className="text-3xl font-black tracking-tight">TIPSON</h1>
            <p className="text-gray-400 text-sm mt-1">Connexion à TIPSON Studio</p>
          </div>
        </div>

        {stage === 'done' ? (
          <div className="text-center space-y-3">
            <p className="text-2xl font-bold">Connecté ✓</p>
            <p className="text-gray-400 text-sm">Retournez à <strong>TIPSON Studio</strong>. Autorisez l&apos;ouverture de l&apos;application si demandé.</p>
            <button onClick={() => window.location.href = window.location.href} className="text-purple-400 text-sm underline underline-offset-2">Renvoyer vers l&apos;app</button>
          </div>
        ) : stage === 'loading' ? (
          <p className="text-center text-gray-500 text-sm">Connexion…</p>
        ) : (
          <>
            <button onClick={handleGoogle} disabled={googleLoading}
              className="w-full py-3.5 rounded-2xl bg-white text-gray-900 font-semibold flex items-center justify-center gap-3 hover:bg-gray-100 disabled:opacity-50 transition active:scale-[0.98]">
              {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                  <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                  <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
                </svg>
              )}
              Continuer avec Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-gray-600 text-xs">ou</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" required autoComplete="email"
                className="w-full px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition" />
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" required autoComplete="current-password"
                  className="w-full px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition pr-12" />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 font-semibold text-lg flex items-center justify-center gap-2 transition">
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                Se connecter
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
