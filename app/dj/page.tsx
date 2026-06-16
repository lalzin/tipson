'use client'
import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, Eye, EyeOff, Mail, CheckCircle2 } from 'lucide-react'
import { LogoBadge } from '@/components/Logo'

type Mode = 'login' | 'signup'

// Apple Sign-In masqué tant que le provider n'est pas configuré (compte Apple Developer requis)
const APPLE_ENABLED = process.env.NEXT_PUBLIC_APPLE_AUTH_ENABLED === 'true'

function DJAuth() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [djName, setDjName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [error, setError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)

  async function handleGoogle() {
    const supabase = createClient()
    setGoogleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dj/dashboard`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) { setError('Connexion Google indisponible.'); setGoogleLoading(false) }
  }

  async function handleApple() {
    const supabase = createClient()
    setAppleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dj/dashboard` },
    })
    if (error) { setError('Connexion Apple indisponible.'); setAppleLoading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    const supabase = createClient()
    setLoading(true)
    setError('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        setError('Email ou mot de passe incorrect')
        setLoading(false)
      } else {
        router.push('/dj/dashboard')
      }
    } else {
      if (password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères'); setLoading(false); return }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { dj_name: djName.trim() || email.split('@')[0] },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dj/dashboard`,
        },
      })
      if (error) {
        setError(error.message.includes('already') ? 'Un compte existe déjà avec cet email' : 'Erreur lors de la création du compte')
        setLoading(false)
        return
      }
      if (data.session) {
        router.push('/dj/dashboard')
      } else {
        setSignupSuccess(true)
        setLoading(false)
      }
    }
  }

  if (signupSuccess) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950">
        <div className="w-full max-w-md text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-green-500/15 border border-green-500/25 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Compte créé !</h2>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              Vérifiez vos emails pour confirmer votre adresse, puis connectez-vous.
              <br />Votre accès organisateur sera ensuite validé par un administrateur.
            </p>
          </div>
          <button onClick={() => { setSignupSuccess(false); setMode('login') }}
            className="text-purple-400 text-sm hover:text-purple-300 transition">
            ← Retour à la connexion
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950">
      <div className="w-full max-w-md space-y-7">
        <div className="text-center space-y-4">
          <LogoBadge className="w-20 h-20 mx-auto" rounded={26} />
          <div>
            <h1 className="text-3xl font-black tracking-tight">TIPSON</h1>
            <p className="text-gray-400 text-sm mt-1">
              {mode === 'login' ? 'Espace organisateur · Connexion' : 'Créer un compte organisateur'}
            </p>
          </div>
        </div>

        <div className="flex gap-1.5 bg-white/5 rounded-2xl p-1 border border-white/10">
          {(['login', 'signup'] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                mode === m ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}>
              {m === 'login' ? 'Connexion' : 'Créer un compte'}
            </button>
          ))}
        </div>

        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full py-3.5 rounded-2xl bg-white text-gray-900 font-semibold flex items-center justify-center gap-3 hover:bg-gray-100 disabled:opacity-50 transition active:scale-[0.98]"
        >
          {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
          )}
          {mode === 'login' ? 'Continuer avec Google' : "S'inscrire avec Google"}
        </button>

        {/* Apple (affiché seulement si le provider est configuré) */}
        {APPLE_ENABLED && (
          <button
            onClick={handleApple}
            disabled={appleLoading}
            className="w-full py-3.5 rounded-2xl bg-black text-white border border-white/15 font-semibold flex items-center justify-center gap-3 hover:bg-gray-900 disabled:opacity-50 transition active:scale-[0.98]"
          >
            {appleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor">
                <path d="M13.07 9.57c-.02-1.9 1.55-2.8 1.62-2.85-.88-1.3-2.26-1.47-2.75-1.49-1.17-.12-2.28.69-2.87.69-.59 0-1.5-.67-2.47-.65-1.27.02-2.44.74-3.09 1.88-1.32 2.29-.34 5.68.95 7.54.63.91 1.38 1.93 2.36 1.9.95-.04 1.31-.61 2.46-.61s1.47.61 2.47.59c1.02-.02 1.67-.93 2.29-1.84.72-1.06 1.02-2.08 1.04-2.13-.02-.01-1.99-.77-2.01-3.03zM11.2 3.9c.52-.64.88-1.51.78-2.4-.75.03-1.67.5-2.21 1.13-.49.56-.91 1.46-.8 2.32.84.07 1.7-.42 2.23-1.05z"/>
              </svg>
            )}
            {mode === 'login' ? 'Continuer avec Apple' : "S'inscrire avec Apple"}
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-gray-600 text-xs">ou</span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <input
              type="text"
              value={djName}
              onChange={e => setDjName(e.target.value)}
              placeholder="Nom d'artiste / organisateur"
              autoComplete="nickname"
              className="w-full px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="votre@email.com"
            required
            autoComplete="email"
            className="w-full px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Mot de passe (min. 6 caractères)' : 'Mot de passe'}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition pr-12"
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 font-semibold text-lg flex items-center justify-center gap-2 transition"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        {mode === 'signup' && (
          <p className="text-center text-xs text-gray-600 leading-relaxed">
            <Mail className="w-3 h-3 inline mr-1" />
            L&apos;accès organisateur est validé manuellement pendant la phase de développement.
          </p>
        )}

        <p className="text-center text-xs text-gray-600">
          Vous êtes client ?{' '}
          <a href="/join" className="text-purple-400 hover:text-purple-300 underline-offset-2 hover:underline">
            Rejoindre une soirée
          </a>
        </p>
      </div>
    </main>
  )
}

export default function DJLoginPage() {
  return (
    <Suspense>
      <DJAuth />
    </Suspense>
  )
}
