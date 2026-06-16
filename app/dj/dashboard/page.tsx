'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Plus, Music2, Play, Pause, StopCircle,
  Settings, LogOut, Loader2, Copy, Check,
  QrCode, TrendingUp, Euro, Trash2, ChevronDown, ChevronUp, Mic2, RotateCcw, Crown
} from 'lucide-react'
import { LogoBadge } from '@/components/Logo'
import type { Session, Profile } from '@/types'
import { cn, formatPrice } from '@/lib/utils'
import NewSessionModal from '@/components/dj/NewSessionModal'
import QRModal from '@/components/dj/QRModal'
import MarqueeText from '@/components/MarqueeText'

export default function DJDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewSession, setShowNewSession] = useState(false)
  const [qrSession, setQrSession] = useState<Session | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)
  const [stats, setStats] = useState<{ totalRevenue: number; totalRequests: number; totalSessions: number }>({
    totalRevenue: 0, totalRequests: 0, totalSessions: 0,
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push('/dj'); return }
    })

    Promise.all([
      fetch('/api/profile').then(r => r.json()),
      fetch('/api/sessions').then(r => r.json()),
      fetch('/api/stats').then(r => r.ok ? r.json() : { totalRevenue: 0, totalRequests: 0, totalSessions: 0 }),
    ]).then(([prof, sess, st]) => {
      setProfile(prof)
      setSessions(Array.isArray(sess) ? sess : [])
      setStats(st)
      setLoading(false)
    })
  }, [router])

  async function updateSessionStatus(id: string, status: string) {
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setSessions(s => s.map(sess => sess.id === id ? updated : sess))
    }
  }

  async function deleteSession(id: string) {
    if (!confirm('Supprimer cette soirée et toutes ses demandes ?')) return
    const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    if (res.ok) setSessions(s => s.filter(sess => sess.id !== id))
  }

  async function copyLink(session: Session) {
    const url = `${window.location.origin}/join?code=${session.code}`
    await navigator.clipboard.writeText(url)
    setCopiedCode(session.code)
    setTimeout(() => setCopiedCode(null), 2500)
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/dj')
  }

  const activeSessions = sessions.filter(s => s.status === 'active')
  const pausedSessions = sessions.filter(s => s.status === 'paused')
  const endedSessions = sessions.filter(s => s.status === 'ended')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto animate-pulse">
            <Music2 className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-gray-500 text-sm">Chargement…</p>
        </div>
      </div>
    )
  }

  // Compte non encore autorisé à organiser des soirées
  if (profile && !profile.is_dj && !profile.is_admin) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-gray-950 via-purple-950/10 to-gray-950">
        <div className="w-full max-w-md space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-purple-600/15 border border-purple-500/25 flex items-center justify-center mx-auto">
            <Music2 className="w-10 h-10 text-purple-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Accès en attente</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              TIPSON est actuellement en accès restreint pendant la phase de développement.
              Votre compte n&apos;est pas encore autorisé à organiser des soirées.
            </p>
            <p className="text-gray-500 text-sm">
              Un administrateur doit valider votre accès. Revenez bientôt !
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <a href="/" className="py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 font-semibold transition">
              Retour à l&apos;accueil
            </a>
            <button onClick={logout} className="py-3 rounded-2xl glass text-gray-400 hover:text-white text-sm transition">
              Se déconnecter
            </button>
          </div>
        </div>
      </main>
    )
  }

  const isAdmin = profile?.is_admin ?? false

  return (
    <main className="min-h-screen bg-gray-950 pb-20">
      {/* Header */}
      <div className="border-b border-white/5 bg-gray-950/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-4 lg:py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo grand */}
            <LogoBadge className="w-10 h-10 lg:w-14 lg:h-14 flex-shrink-0" />
            <div>
              <p className="font-black text-base lg:text-xl leading-none tracking-tight">TIPSON</p>
              <p className="text-gray-500 text-xs lg:text-sm mt-0.5 leading-none">{profile?.dj_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 lg:gap-2">
            {isAdmin && (
              <button onClick={() => router.push('/admin')}
                className="p-2 lg:px-4 lg:py-2 rounded-xl hover:bg-yellow-500/10 text-yellow-400 hover:text-yellow-300 transition flex items-center gap-2 text-sm">
                <Crown className="w-4 h-4" />
                <span className="hidden lg:inline">Admin</span>
              </button>
            )}
            <button onClick={() => router.push('/dj/settings')}
              className="p-2 lg:px-4 lg:py-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition flex items-center gap-2 text-sm">
              <Settings className="w-4 h-4" />
              <span className="hidden lg:inline">Paramètres</span>
            </button>
            <button onClick={logout}
              className="p-2 lg:px-4 lg:py-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition flex items-center gap-2 text-sm">
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8 lg:py-10 space-y-8">
        {/* Rappel : configurer les versements (Stripe Connect) */}
        {profile && (profile as any).payouts_enabled === false && (
          <button onClick={() => router.push('/dj/settings')}
            className="w-full bg-green-500/10 border border-green-500/30 rounded-2xl p-4 flex items-center gap-3 hover:bg-green-500/15 transition text-left">
            <span className="text-2xl">💸</span>
            <div>
              <p className="text-green-300 font-semibold text-sm">Configurez vos versements</p>
              <p className="text-green-500/70 text-xs mt-0.5">Renseignez vos coordonnées bancaires pour recevoir vos pourboires → Régler maintenant</p>
            </div>
          </button>
        )}

        {/* Stats + CTA — layout desktop côte à côte */}
        <div className="lg:flex lg:items-stretch lg:gap-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 lg:flex-1">
            <div className="glass rounded-2xl p-4 lg:p-6 text-center space-y-2">
              <Euro className="w-5 h-5 lg:w-6 lg:h-6 text-green-400 mx-auto" />
              <p className="text-xl lg:text-3xl font-black text-green-300">{formatPrice(stats.totalRevenue)}</p>
              <p className="text-gray-500 text-xs lg:text-sm">Revenus totaux</p>
            </div>
            <div className="glass rounded-2xl p-4 lg:p-6 text-center space-y-2">
              <Music2 className="w-5 h-5 lg:w-6 lg:h-6 text-purple-400 mx-auto" />
              <p className="text-xl lg:text-3xl font-black text-purple-300">{stats.totalRequests}</p>
              <p className="text-gray-500 text-xs lg:text-sm">Demandes</p>
            </div>
            <div className="glass rounded-2xl p-4 lg:p-6 text-center space-y-2">
              <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-blue-400 mx-auto" />
              <p className="text-xl lg:text-3xl font-black text-blue-300">{stats.totalSessions}</p>
              <p className="text-gray-500 text-xs lg:text-sm">Soirées</p>
            </div>
          </div>

          {/* CTA */}
          <button onClick={() => setShowNewSession(true)}
            className="mt-4 lg:mt-0 lg:w-64 w-full py-4 lg:py-0 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 font-bold text-lg flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-lg shadow-purple-900/30">
            <Plus className="w-5 h-5 lg:w-6 lg:h-6" />
            <span>Démarrer<br className="hidden lg:block" /> une soirée</span>
          </button>
        </div>

        {/* Sessions actives + en pause */}
        {(activeSessions.length > 0 || pausedSessions.length > 0) && (
          <section className="space-y-3">
            <h2 className="font-bold text-gray-300 text-xs uppercase tracking-widest">En cours</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {[...activeSessions, ...pausedSessions].map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  copiedCode={copiedCode}
                  onCopy={copyLink}
                  onQR={() => setQrSession(session)}
                  onOpen={() => router.push(`/dj/session/${session.id}`)}
                  onStatusChange={updateSessionStatus}
                />
              ))}
            </div>
          </section>
        )}

        {/* Sessions terminées */}
        {endedSessions.length > 0 && (
          <section className="space-y-3">
            <button onClick={() => setShowPast(v => !v)}
              className="flex items-center gap-2 text-gray-600 text-xs uppercase tracking-widest hover:text-gray-400 transition">
              {showPast ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Soirées passées ({endedSessions.length})
            </button>
            {showPast && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {endedSessions.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    copiedCode={copiedCode}
                    onCopy={copyLink}
                    onQR={() => setQrSession(session)}
                    onOpen={() => router.push(`/dj/session/${session.id}`)}
                    onStatusChange={updateSessionStatus}
                    onDelete={deleteSession}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {sessions.length === 0 && (
          <div className="text-center py-24 text-gray-600 space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-white/3 border border-white/5 flex items-center justify-center mx-auto">
              <Music2 className="w-7 h-7 opacity-40" />
            </div>
            <p className="font-medium text-gray-500">Aucune soirée pour l&apos;instant</p>
            <p className="text-sm">Créez votre première session ci-dessus</p>
          </div>
        )}
      </div>

      {showNewSession && (
        <NewSessionModal
          onClose={() => setShowNewSession(false)}
          onCreate={session => {
            setSessions(s => [session, ...s])
            setShowNewSession(false)
            router.push(`/dj/session/${session.id}`)
          }}
        />
      )}

      {qrSession && (
        <QRModal session={qrSession} onClose={() => setQrSession(null)} />
      )}
    </main>
  )
}

function SessionCard({
  session, copiedCode, onCopy, onQR, onOpen, onStatusChange, onDelete
}: {
  session: Session
  copiedCode: string | null
  onCopy: (s: Session) => void
  onQR: () => void
  onOpen: () => void
  onStatusChange: (id: string, status: string) => void
  onDelete?: (id: string) => void
}) {
  const statusDot = {
    active: 'bg-green-500',
    paused: 'bg-yellow-500',
    ended: 'bg-gray-600',
  }[session.status]

  const statusLabel = {
    active: 'En direct',
    paused: 'En pause',
    ended: 'Terminée',
  }[session.status]

  return (
    <div className={cn(
      'glass rounded-2xl p-4 space-y-3',
      session.status === 'active' && 'border-green-500/20'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex-shrink-0 flex flex-col items-center gap-1">
            <div className={cn('w-2 h-2 rounded-full', statusDot, session.status === 'active' && 'animate-pulse')} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              {(session as any).session_type === 'karaoke' ? (
                <span className="flex-shrink-0 flex items-center gap-1 bg-pink-500/15 border border-pink-500/20 rounded-full px-2 py-0.5 text-pink-300 text-xs font-semibold">
                  <Mic2 className="w-3 h-3" /> Karaoké
                </span>
              ) : (
                <span className="flex-shrink-0 flex items-center gap-1 bg-purple-500/15 border border-purple-500/20 rounded-full px-2 py-0.5 text-purple-300 text-xs font-semibold">
                  <Music2 className="w-3 h-3" /> DJ
                </span>
              )}
              <MarqueeText text={session.name} className="font-bold" />
            </div>
            {session.venue && <p className="text-gray-500 text-xs truncate">{session.venue}</p>}
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('text-xs font-medium', {
                'text-green-400': session.status === 'active',
                'text-yellow-400': session.status === 'paused',
                'text-gray-500': session.status === 'ended',
              })}>{statusLabel}</span>
              <span className="text-gray-700 text-xs">·</span>
              <span className="text-gray-500 text-xs">
                {new Date(session.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <code className="text-xs bg-white/5 px-2 py-1 rounded-lg text-gray-400 font-mono">{session.code}</code>
          <button
            onClick={() => onCopy(session)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition"
            title="Copier le lien"
          >
            {copiedCode === session.code ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onQR}
            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition"
            title="QR code"
          >
            <QrCode className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {session.status === 'ended' ? (
          /* Soirée terminée : réactiver ou supprimer */
          <>
            <button
              onClick={() => onStatusChange(session.id, 'active')}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 transition bg-green-600/15 border border-green-500/30 text-green-300 hover:bg-green-600/25"
            >
              <RotateCcw className="w-4 h-4" /> Réactiver
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(session.id)}
                className="px-3 py-2.5 rounded-xl glass hover:bg-red-500/10 hover:border-red-500/30 text-gray-600 hover:text-red-400 transition"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          /* Soirée active ou en pause */
          <>
            <button
              onClick={onOpen}
              className={cn(
                'flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 transition',
                session.status === 'active'
                  ? 'bg-purple-600/25 border border-purple-500/40 text-purple-300 hover:bg-purple-600/35'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/8'
              )}
            >
              Gérer les demandes
            </button>
            {session.status === 'active' && (
              <button
                onClick={() => onStatusChange(session.id, 'paused')}
                className="px-3 py-2.5 rounded-xl glass hover:bg-yellow-500/10 hover:border-yellow-500/30 text-gray-500 hover:text-yellow-400 transition"
                title="Pause"
              >
                <Pause className="w-4 h-4" />
              </button>
            )}
            {session.status === 'paused' && (
              <button
                onClick={() => onStatusChange(session.id, 'active')}
                className="px-3 py-2.5 rounded-xl glass hover:bg-green-500/10 hover:border-green-500/30 text-gray-500 hover:text-green-400 transition"
                title="Reprendre"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => confirm('Terminer cette soirée définitivement ?') && onStatusChange(session.id, 'ended')}
              className="px-3 py-2.5 rounded-xl glass hover:bg-red-500/10 hover:border-red-500/30 text-gray-500 hover:text-red-400 transition"
              title="Terminer"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
