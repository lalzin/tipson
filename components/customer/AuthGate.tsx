'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Music2, Mail, Loader2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  sessionName: string
  djName: string
  onAuth: () => void
}

export default function AuthGate({ sessionName, djName, onAuth }: Props) {
  const [mode, setMode] = useState<'choice' | 'email' | 'sent'>('choice')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function signInWithGoogle() {
    const supabase = createClient()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  async function signInWithApple() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    const supabase = createClient()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setMode('sent')
    setLoading(false)
  }

  function continueAsGuest() {
    onAuth()
  }

  if (mode === 'sent') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-950">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-purple-600/15 border border-purple-500/25 flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Vérifiez vos emails</h2>
            <p className="text-gray-400 text-sm mt-1">
              Lien envoyé à <strong className="text-white">{email}</strong>
            </p>
          </div>
          <p className="text-gray-500 text-xs">Cliquez le lien dans l&apos;email pour rejoindre la soirée</p>
          <button onClick={() => setMode('email')} className="text-purple-400 text-sm hover:text-purple-300 transition">
            ← Changer d&apos;email
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-950 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm space-y-7 relative">
        {/* Header soirée */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-600/15 border border-purple-500/25">
            <Music2 className="w-7 h-7 text-purple-400" />
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-widest">{djName}</p>
            <h1 className="text-xl font-bold mt-0.5">{sessionName}</h1>
            <p className="text-gray-400 text-sm mt-1">Connectez-vous pour demander un son</p>
          </div>
        </div>

        {mode === 'choice' && (
          <div className="space-y-3">
            {/* Google */}
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-white text-gray-900 font-semibold flex items-center justify-center gap-3 hover:bg-gray-100 disabled:opacity-50 transition active:scale-[0.98]"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
              </svg>
              Continuer avec Google
            </button>

            {/* Apple */}
            <button
              onClick={signInWithApple}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-black text-white border border-white/15 font-semibold flex items-center justify-center gap-3 hover:bg-gray-900 disabled:opacity-50 transition active:scale-[0.98]"
            >
              <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor">
                <path d="M13.07 9.57c-.02-1.9 1.55-2.8 1.62-2.85-.88-1.3-2.26-1.47-2.75-1.49-1.17-.12-2.28.69-2.87.69-.59 0-1.5-.67-2.47-.65-1.27.02-2.44.74-3.09 1.88-1.32 2.29-.34 5.68.95 7.54.63.91 1.38 1.93 2.36 1.9.95-.04 1.31-.61 2.46-.61s1.47.61 2.47.59c1.02-.02 1.67-.93 2.29-1.84.72-1.06 1.02-2.08 1.04-2.13-.02-.01-1.99-.77-2.01-3.03zM11.2 3.9c.52-.64.88-1.51.78-2.4-.75.03-1.67.5-2.21 1.13-.49.56-.91 1.46-.8 2.32.84.07 1.7-.42 2.23-1.05z"/>
              </svg>
              Continuer avec Apple
            </button>

            {/* Séparateur */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-gray-600 text-xs">ou</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {/* Email */}
            <button
              onClick={() => setMode('email')}
              className="w-full py-3.5 rounded-2xl glass text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/8 transition active:scale-[0.98]"
            >
              <Mail className="w-4 h-4 text-gray-400" />
              Continuer avec l&apos;email
            </button>

            {/* Invité */}
            <button
              onClick={continueAsGuest}
              disabled={loading}
              className="w-full py-3 text-gray-500 text-sm hover:text-gray-300 flex items-center justify-center gap-1.5 transition"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              Continuer sans compte
            </button>
          </div>
        )}

        {mode === 'email' && (
          <form onSubmit={signInWithEmail} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Votre email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@example.com"
                required
                autoFocus
                className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 font-semibold flex items-center justify-center gap-2 transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Envoyer le lien
            </button>
            <button type="button" onClick={() => setMode('choice')} className="w-full text-gray-500 text-sm hover:text-gray-300 transition py-1">
              ← Retour
            </button>
          </form>
        )}

        {error && mode === 'choice' && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
      </div>
    </main>
  )
}
