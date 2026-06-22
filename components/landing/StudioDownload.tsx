'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Apple, Monitor, Terminal, Download, Loader2, Lock, UserPlus } from 'lucide-react'

type OS = 'mac' | 'win' | 'linux'
type Auth =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'pending' }     // connecté mais pas (encore) DJ
  | { status: 'dj' }

const PLATFORMS: { id: OS; label: string; icon: typeof Apple }[] = [
  { id: 'mac', label: 'macOS', icon: Apple },
  { id: 'win', label: 'Windows', icon: Monitor },
  { id: 'linux', label: 'Linux', icon: Terminal },
]

function detectOS(): OS {
  if (typeof navigator === 'undefined') return 'mac'
  const s = `${navigator.userAgent} ${navigator.platform}`.toLowerCase()
  if (s.includes('win')) return 'win'
  if (s.includes('linux') || s.includes('android')) return 'linux'
  return 'mac'
}

export default function StudioDownload() {
  const [os, setOs] = useState<OS>('mac')
  const [auth, setAuth] = useState<Auth>({ status: 'loading' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState<OS | null>(null)

  useEffect(() => {
    setOs(detectOS())
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { setAuth({ status: 'guest' }); return }
      try {
        const res = await fetch('/api/profile')
        const p = res.ok ? await res.json() : null
        setAuth({ status: p?.is_dj || p?.is_admin ? 'dj' : 'pending' })
      } catch { setAuth({ status: 'pending' }) }
    })
  }, [])

  async function download(platform: OS) {
    setMsg(''); setBusy(platform)
    const url = `/api/studio/download?platform=${platform}`
    try {
      const res = await fetch(url, { redirect: 'manual' })
      if (res.type === 'opaqueredirect' || res.status === 0) {
        window.location.href = url // déclenche le vrai téléchargement (redirection 302)
      } else if (res.status === 503) {
        setMsg('Bientôt disponible pour cette plateforme — on te prévient très vite.')
      } else if (res.status === 401) {
        setAuth({ status: 'guest' })
      } else if (res.status === 403) {
        setAuth({ status: 'pending' })
      } else {
        setMsg('Téléchargement indisponible pour le moment.')
      }
    } catch {
      setMsg('Erreur réseau — réessaie dans un instant.')
    } finally { setBusy(null) }
  }

  if (auth.status === 'loading') {
    return <div className="h-14 w-64 animate-pulse rounded-2xl bg-white/5" />
  }

  if (auth.status === 'guest') {
    return (
      <div className="flex flex-col items-center gap-3 lg:items-start">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300">
          <Lock className="h-4 w-4 text-fuchsia-300" /> Téléchargement réservé aux comptes DJ
        </div>
        <Link href="/dj"
          className="lp-glow group flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-7 py-4 text-lg font-bold text-gray-950 transition hover:brightness-110">
          <UserPlus className="h-5 w-5" /> Créer un compte DJ
        </Link>
        <p className="text-sm text-gray-500">Déjà DJ ? <Link href="/dj" className="text-cyan-300 underline-offset-2 hover:underline">Se connecter</Link></p>
      </div>
    )
  }

  if (auth.status === 'pending') {
    return (
      <div className="flex flex-col items-center gap-3 lg:items-start">
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <Lock className="h-4 w-4" /> Ton compte n&apos;a pas encore le rôle DJ
        </div>
        <p className="max-w-sm text-sm text-gray-400">
          TIPSON Studio est réservé aux organisateurs. Crée ta première soirée depuis le tableau de bord,
          ou contacte-nous pour activer ton accès DJ.
        </p>
        <Link href="/dj/dashboard"
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-semibold backdrop-blur transition hover:bg-white/10">
          Aller au tableau de bord
        </Link>
      </div>
    )
  }

  // status === 'dj'
  const primary = PLATFORMS.find(p => p.id === os)!
  const others = PLATFORMS.filter(p => p.id !== os)
  return (
    <div className="flex flex-col items-center gap-4 lg:items-start">
      <button onClick={() => download(primary.id)} disabled={busy === primary.id}
        className="lp-glow group flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-8 py-4 text-lg font-bold text-gray-950 transition hover:brightness-110 disabled:opacity-60">
        {busy === primary.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
        Télécharger pour {primary.label}
      </button>
      <div className="flex items-center gap-3">
        {others.map(p => (
          <button key={p.id} onClick={() => download(p.id)} disabled={busy === p.id}
            className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-300 backdrop-blur transition hover:bg-white/10 disabled:opacity-60">
            {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <p.icon className="h-4 w-4" />}
            {p.label}
          </button>
        ))}
      </div>
      {msg && <p className="text-sm text-amber-200">{msg}</p>}
    </div>
  )
}
