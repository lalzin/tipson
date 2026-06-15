'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function JoinForm() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Détecte si un client est connecté (pour afficher l'accès au compte)
  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => setIsAuthed(!!session?.user))
  }, [])

  // Auto-remplissage depuis le lien QR (?code=XXXXXX)
  useEffect(() => {
    const c = searchParams.get('code')
    if (c) {
      setCode(c.toUpperCase())
      // Auto-submit
      setTimeout(() => handleJoinCode(c.toUpperCase()), 300)
    }
  }, [])

  async function handleJoinCode(c: string) {
    const trimmed = c.trim().toUpperCase()
    if (trimmed.length !== 6) return
    setLoading(true)
    setError('')
    const res = await fetch(`/api/session-by-code?code=${trimmed}`)
    if (!res.ok) {
      setError('Code invalide, vérifiez le code et réessayez')
      setLoading(false)
      return
    }
    const session = await res.json()
    router.push(`/session/${session.id}`)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    await handleJoinCode(code)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-950 relative overflow-hidden">
      {/* Glow bg */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-10 relative">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-purple-600/15 border border-purple-500/25 shadow-xl shadow-purple-900/20">
            <span className="text-4xl font-black text-white">T</span>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">TIPSON</h1>
            <p className="text-gray-500 text-sm mt-1">Demandez vos sons : DJ, karaoké ou jukebox</p>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleJoin} className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-400 text-center">
              Code de la soirée
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="· · · · · ·"
              maxLength={6}
              className="w-full px-4 py-5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-700 text-center text-3xl font-black font-mono tracking-[0.4em] focus:outline-none focus:border-purple-500 focus:bg-white/8 transition"
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg transition active:scale-[0.98]"
          >
            {loading ? 'Connexion…' : 'Rejoindre la soirée →'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-700">
          Vous êtes DJ ?{' '}
          <a href="/dj" className="text-purple-500 hover:text-purple-400 transition">
            Accès DJ
          </a>
        </p>

        {isAuthed && (
          <a href="/account"
            className="block text-center text-sm text-gray-400 hover:text-white transition py-2 rounded-xl glass">
            Voir mon compte & mes participations →
          </a>
        )}
      </div>
    </main>
  )
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  )
}
