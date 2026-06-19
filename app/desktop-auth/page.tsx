'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

// Page de relais pour l'app desktop (TIPSON Studio).
// L'app ouvre cette page dans le navigateur → l'utilisateur se connecte
// (Google ou email) → on renvoie la session à l'app via le deep-link tipson://.
export default function DesktopAuthPage() {
  const [stage, setStage] = useState<'loading' | 'login' | 'done'>('loading')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) handoff(data.session)
      else setStage('login')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) handoff(session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  function handoff(session: Session) {
    setStage('done')
    const url = `tipson://auth#access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}`
    window.location.href = url
  }

  async function google() {
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/desktop-auth` },
    })
    if (error) setError(error.message)
  }

  async function emailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.session) handoff(data.session)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-gray-950 text-white">
      <div className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-3xl p-7 space-y-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 grid place-items-center font-black text-xl mx-auto">T</div>

        {stage === 'loading' && <p className="text-gray-400 text-sm">Connexion…</p>}

        {stage === 'done' && (
          <>
            <h1 className="text-xl font-bold">Connecté ✓</h1>
            <p className="text-gray-400 text-sm">Retournez à <strong>TIPSON Studio</strong>. Si rien ne se passe, autorisez l&apos;ouverture de l&apos;application.</p>
            <button onClick={() => window.location.href = window.location.href} className="text-purple-400 text-sm underline">Renvoyer vers l&apos;app</button>
          </>
        )}

        {stage === 'login' && (
          <>
            <div>
              <h1 className="text-xl font-bold">Connexion à TIPSON Studio</h1>
              <p className="text-gray-500 text-sm mt-1">Pour lancer le visualiseur sur le bureau.</p>
            </div>
            <button onClick={google} className="w-full py-3 rounded-2xl bg-white text-gray-900 font-semibold hover:bg-gray-200 transition">
              Continuer avec Google
            </button>
            <div className="flex items-center gap-3 text-gray-600 text-xs">
              <div className="flex-1 h-px bg-white/10" />ou<div className="flex-1 h-px bg-white/10" />
            </div>
            <form onSubmit={emailLogin} className="space-y-3 text-left">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500" />
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold disabled:opacity-50">
                {loading ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          </>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    </main>
  )
}
