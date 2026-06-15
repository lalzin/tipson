'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft, Check, X, Play, Clock, Zap,
  Music2, Loader2, Euro, ListMusic, Bell, BellOff,
  ChevronDown, Pause, StopCircle, Share2, Users, Download, Mic2, RotateCcw
} from 'lucide-react'
import type { Request, Session } from '@/types'
import { cn, formatPrice } from '@/lib/utils'
import QRModal from '@/components/dj/QRModal'
import KaraokeQueue from '@/components/dj/KaraokeQueue'
import MusicLinks from '@/components/dj/MusicLinks'
import BlacklistModal from '@/components/dj/BlacklistModal'
import PromoCodesModal from '@/components/dj/PromoCodesModal'
import { DISPLAY_THEMES, EMOJI_PALETTE, displayEmojis } from '@/lib/displayThemes'

type FilterStatus = 'paid' | 'approved' | 'played' | 'rejected' | 'all'

export default function DJSessionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('paid')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showQR, setShowQR] = useState(false)
  const [showViz, setShowViz] = useState(false)
  const [showBlacklist, setShowBlacklist] = useState(false)
  const [showPromo, setShowPromo] = useState(false)
  const [showPrices, setShowPrices] = useState(false)
  const [editNormal, setEditNormal] = useState('')
  const [editPriority, setEditPriority] = useState('')
  const [savingPrices, setSavingPrices] = useState(false)
  const [priceError, setPriceError] = useState('')
  const [showParticipants, setShowParticipants] = useState(false)
  const [participants, setParticipants] = useState<{ email: string | null; name: string | null; anonymous: boolean }[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const soundRef = useRef<boolean>(true)

  useEffect(() => { soundRef.current = soundEnabled }, [soundEnabled])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) router.push('/dj')
    })

    async function load() {
      const [sessRes, reqRes] = await Promise.all([
        fetch(`/api/sessions/${id}`),
        fetch(`/api/sessions/${id}/requests`),
      ])
      if (sessRes.ok) setSession(await sessRes.json())
      if (reqRes.ok) setRequests(await reqRes.json())
      setLoading(false)
    }
    load()

    // Realtime
    const channel = supabase
      .channel(`dj-session-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'requests', filter: `session_id=eq.${id}` },
        payload => {
          const newReq = payload.new as Request
          // N'afficher que les demandes payées (pas pending_payment)
          if (newReq.status !== 'pending_payment') {
            setRequests(prev => [newReq, ...prev])
            if (soundRef.current) playNotificationSound()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'requests', filter: `session_id=eq.${id}` },
        payload => {
          const updated = payload.new as Request
          setRequests(prev => {
            const exists = prev.find(r => r.id === updated.id)
            if (!exists && updated.status === 'paid') {
              // Nouvelle demande qui vient d'être payée
              if (soundRef.current) playNotificationSound()
              return [updated, ...prev]
            }
            return prev.map(r => r.id === updated.id ? updated : r)
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, router])

  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.frequency.setValueAtTime(880, ctx.currentTime)
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.4)
    } catch {}
  }

  async function updateRequest(reqId: string, status: string) {
    const res = await fetch(`/api/requests/${reqId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: updated.status } : r))
    }
  }

  async function updateConfig(patch: Record<string, unknown>) {
    if (!session) return
    setSession({ ...session, ...patch } as typeof session) // optimiste
    const res = await fetch(`/api/sessions/${session.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) setSession(await res.json())
  }

  async function prioritizeRequest(reqId: string) {
    const res = await fetch(`/api/requests/${reqId}/prioritize`, { method: 'POST' })
    if (res.ok) {
      const updated = await res.json()
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, queue_position: updated.queue_position } : r))
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Impossible de prioriser')
    }
  }

  async function openParticipants() {
    setShowParticipants(true)
    if (participants.length > 0) return
    setLoadingParticipants(true)
    const res = await fetch(`/api/sessions/${id}/participants`)
    if (res.ok) setParticipants(await res.json())
    setLoadingParticipants(false)
  }

  function exportCSV() {
    const withEmails = participants.filter(p => p.email)
    const csv = 'Email,Nom\n' + withEmails.map(p => `${p.email},${p.name ?? ''}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `participants-${session?.code ?? id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function openPrices() {
    setEditNormal(session ? (session.price_normal / 100).toString() : '1')
    setEditPriority(session ? (session.price_priority / 100).toString() : '5')
    setPriceError('')
    setShowPrices(true)
  }

  async function savePrices() {
    if (!session) return
    const pNormal = Math.round(parseFloat(editNormal) * 100)
    const pPriority = session.session_type === 'karaoke' ? 0 : Math.round(parseFloat(editPriority) * 100)
    if (isNaN(pNormal) || pNormal < 0) return
    // 0€ = gratuit. Le prix prioritaire (s'il est > 0) doit rester supérieur au prix normal.
    if (session.session_type !== 'karaoke' && (isNaN(pPriority) || pPriority < 0 || (pPriority > 0 && pPriority <= pNormal))) return
    setSavingPrices(true)
    try {
      const body: Record<string, number> = { price_normal: pNormal }
      if (session.session_type !== 'karaoke') body.price_priority = pPriority
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setSession(data)
        setShowPrices(false)
      } else {
        setPriceError(data.error || 'Impossible de sauvegarder')
      }
    } catch {
      setPriceError('Erreur réseau, réessayez.')
    } finally {
      setSavingPrices(false)
    }
  }

  async function updateSessionStatus(status: string) {
    if (!session) return
    const res = await fetch(`/api/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (res.ok) {
      setSession(data)
    } else {
      alert(`Erreur (${res.status}): ${data.error || JSON.stringify(data)}`)
    }
  }

  const filteredRequests = requests.filter(r =>
    filter === 'all' ? r.status !== 'pending_payment' : r.status === filter
  )

  const paidRequests = requests.filter(r => ['paid', 'approved', 'played'].includes(r.status))
  const totalRevenue = paidRequests.reduce((sum, r) => sum + r.amount, 0)
  const pendingCount = requests.filter(r => r.status === 'paid').length
  const priorityPending = requests.filter(r => r.status === 'paid' && r.request_type === 'priority').length

  const filterCounts: Record<FilterStatus, number> = {
    paid: requests.filter(r => r.status === 'paid').length,
    approved: requests.filter(r => r.status === 'approved').length,
    played: requests.filter(r => r.status === 'played').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    all: requests.filter(r => r.status !== 'pending_payment').length,
  }

  const currentEmojis = displayEmojis(session)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header sticky */}
      <div className="border-b border-white/5 bg-gray-950/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-3 lg:py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dj/dashboard')} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition flex-shrink-0">
              <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>

            {/* Logo + titre */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className={cn('hidden lg:flex w-10 h-10 rounded-2xl items-center justify-center',
                session?.session_type === 'karaoke'
                  ? 'bg-pink-600/20 border border-pink-500/30'
                  : 'bg-purple-600/20 border border-purple-500/30'
              )}>
                {session?.session_type === 'karaoke'
                  ? <Mic2 className="w-5 h-5 text-pink-400" />
                  : <span className="text-purple-300 font-black text-base">T</span>}
              </div>
              <div>
                <p className="font-bold text-sm lg:text-lg leading-tight truncate max-w-[200px] lg:max-w-none">{session?.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', {
                    'bg-green-500 animate-pulse': session?.status === 'active',
                    'bg-yellow-500': session?.status === 'paused',
                    'bg-gray-500': session?.status === 'ended',
                  })} />
                  <p className="text-gray-500 text-xs font-mono">{session?.code}</p>
                  {session?.venue && <><span className="text-gray-700 text-xs">·</span><p className="text-gray-600 text-xs truncate hidden sm:block">{session.venue}</p></>}
                  <span className={cn('text-xs font-medium hidden lg:block', {
                    'text-green-400': session?.status === 'active',
                    'text-yellow-400': session?.status === 'paused',
                    'text-gray-500': session?.status === 'ended',
                  })}>
                    {session?.status === 'active' ? '● En direct' : session?.status === 'paused' ? '⏸ En pause' : '■ Terminée'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1" />

            {/* Contrôles session — desktop dans le header */}
            <div className="hidden lg:flex items-center gap-2">
              {session?.status === 'ended' ? (
                <button onClick={() => updateSessionStatus('active')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600/15 border border-green-500/30 text-green-300 hover:bg-green-600/25 text-sm transition font-medium">
                  <RotateCcw className="w-4 h-4" /> Réactiver
                </button>
              ) : (
                <>
                  {session?.status === 'active' && (
                    <button onClick={() => updateSessionStatus('paused')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl glass text-yellow-400 hover:bg-yellow-500/10 text-sm transition font-medium">
                      <Pause className="w-4 h-4" /> Pause
                    </button>
                  )}
                  {session?.status === 'paused' && (
                    <button onClick={() => updateSessionStatus('active')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl glass text-green-400 hover:bg-green-500/10 text-sm transition font-medium">
                      <Play className="w-4 h-4" /> Reprendre
                    </button>
                  )}
                  <button onClick={() => confirm('Terminer la soirée définitivement ?') && updateSessionStatus('ended')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl glass text-red-400 hover:bg-red-500/10 text-sm transition font-medium">
                    <StopCircle className="w-4 h-4" /> Terminer
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => setSoundEnabled(s => !s)}
                className={cn('p-2 rounded-xl transition', soundEnabled ? 'text-purple-400 hover:bg-purple-500/10' : 'text-gray-600 hover:bg-white/5')}
                title={soundEnabled ? 'Couper les sons' : 'Activer les sons'}>
                {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
              <button onClick={() => setShowQR(true)} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition" title="QR Code">
                <Share2 className="w-4 h-4" />
              </button>
              <button onClick={openParticipants} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition" title="Participants">
                <Users className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Layout desktop 2 colonnes */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-5 lg:py-8 lg:grid lg:grid-cols-[320px_1fr] lg:gap-8 lg:items-start">

        {/* ── SIDEBAR GAUCHE (desktop sticky) ── */}
        <aside className="lg:sticky lg:top-[73px] space-y-4">

          {/* Alerte priorité */}
          {priorityPending > 0 && (
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/10 border border-purple-500/40 rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-purple-200 font-semibold text-sm">
                  {priorityPending} demande{priorityPending > 1 ? 's' : ''} MAINTENANT !
                </p>
                <p className="text-purple-400/60 text-xs">Validez rapidement</p>
              </div>
              <button onClick={() => setFilter('paid')} className="text-purple-300 text-xs font-medium hover:text-white transition flex-shrink-0">
                Voir →
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-2">
            <StatMini value={formatPrice(totalRevenue)} label="Revenus" color="green" />
            <StatMini value={String(filterCounts.paid)} label="À valider" color={filterCounts.paid > 0 ? 'purple' : 'gray'} />
            <StatMini value={String(filterCounts.approved)} label="Validées" color="blue" />
            <StatMini value={String(filterCounts.played)} label="Jouées" color="gray" />
          </div>

          {/* Prix */}
          <button onClick={openPrices}
            className="w-full glass rounded-2xl px-4 py-3 flex items-center justify-between hover:bg-white/5 transition">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="text-blue-300 font-semibold">{formatPrice(session?.price_normal ?? 100)}</span>
              <span className="text-gray-600 text-xs">Playlist</span>
              <span className="text-gray-700">·</span>
              <span className="text-purple-300 font-semibold">{formatPrice(session?.price_priority ?? 500)}</span>
              <span className="text-gray-600 text-xs">Maintenant</span>
            </div>
            <span className="text-gray-600 text-xs flex-shrink-0 ml-2">Modifier →</span>
          </button>

          {/* Contrôles session — mobile seulement */}
          <div className="flex gap-2 lg:hidden">
            {session?.status === 'ended' ? (
              <button onClick={() => updateSessionStatus('active')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600/15 border border-green-500/30 text-green-300 hover:bg-green-600/25 text-sm transition">
                <RotateCcw className="w-3.5 h-3.5" /> Réactiver
              </button>
            ) : (
              <>
                {session?.status === 'active' && (
                  <button onClick={() => updateSessionStatus('paused')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-yellow-400 hover:bg-yellow-500/10 text-sm transition">
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </button>
                )}
                {session?.status === 'paused' && (
                  <button onClick={() => updateSessionStatus('active')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-green-400 hover:bg-green-500/10 text-sm transition">
                    <Play className="w-3.5 h-3.5" /> Reprendre
                  </button>
                )}
                <button onClick={() => confirm('Terminer la soirée définitivement ?') && updateSessionStatus('ended')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-red-400 hover:bg-red-500/10 text-sm transition ml-auto">
                  <StopCircle className="w-3.5 h-3.5" /> Terminer
                </button>
              </>
            )}
          </div>

          {/* QR code preview desktop */}
          <div className="hidden lg:block glass rounded-2xl p-4 text-center space-y-3">
            <p className="text-gray-500 text-xs uppercase tracking-widest">Code soirée</p>
            <p className="font-black text-4xl tracking-[0.3em] text-white font-mono">{session?.code}</p>
            <button onClick={() => setShowQR(true)}
              className="w-full py-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 text-sm font-medium transition flex items-center justify-center gap-2">
              <Share2 className="w-4 h-4" /> Afficher le QR Code
            </button>
          </div>

          {/* Liste noire — DJ uniquement */}
          {session && session.session_type !== 'karaoke' && (
            <button onClick={() => setShowBlacklist(true)}
              className="w-full glass rounded-2xl p-4 flex items-center justify-between hover:bg-white/8 transition text-left">
              <span className="text-sm font-semibold flex items-center gap-2">🔥 Liste noire</span>
              <span className="text-gray-500 text-xs">Configurer →</span>
            </button>
          )}

          {/* Codes promo */}
          <button onClick={() => setShowPromo(true)}
            className="w-full glass rounded-2xl p-4 flex items-center justify-between hover:bg-white/8 transition text-left">
            <span className="text-sm font-semibold flex items-center gap-2">🎟️ Codes promo</span>
            <span className="text-gray-500 text-xs">Gérer →</span>
          </button>

          {/* Mode visualisation (beta) — DJ uniquement */}
          {session && session.session_type !== 'karaoke' && (
            <button onClick={() => setShowViz(true)}
              className="w-full glass rounded-2xl p-4 flex items-center justify-between hover:bg-white/8 transition text-left">
              <span className="text-sm font-semibold flex items-center gap-2">📺 Mode visualisation</span>
              <span className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">beta</span>
                <span className="text-gray-500 text-xs">Configurer →</span>
              </span>
            </button>
          )}
        </aside>

        {/* ── COLONNE DROITE : LISTE DES DEMANDES ── */}
        <div className="mt-5 lg:mt-0 space-y-4">
          {/* Filtres — uniquement en mode DJ */}
          <div className={cn('flex gap-2 overflow-x-auto pb-1 scrollbar-hide', session?.session_type === 'karaoke' && 'hidden')}>
            {(['paid', 'approved', 'played', 'rejected', 'all'] as FilterStatus[]).map(f => {
              const labels: Record<FilterStatus, string> = {
                paid: '⏳ À valider',
                approved: '✓ Validées',
                played: '▶ Jouées',
                rejected: '✗ Refusées',
                all: 'Toutes',
              }
              const count = filterCounts[f]
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className={cn(
                    'flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition flex items-center gap-1.5 whitespace-nowrap',
                    filter === f ? 'bg-purple-600 text-white' : 'glass text-gray-400 hover:text-white'
                  )}>
                  {labels[f]}
                  {count > 0 && (
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center', filter === f ? 'bg-white/20' : 'bg-white/10')}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Mode karaoké : queue */}
          {session?.session_type === 'karaoke' ? (
            <div className="pb-12">
              <KaraokeQueue
                requests={requests.filter(r => r.status !== 'pending_payment')}
                onCall={id => updateRequest(id, 'approved')}
                onDone={id => updateRequest(id, 'played')}
                onSkip={id => updateRequest(id, 'rejected')}
                onPrioritize={prioritizeRequest}
              />
            </div>
          ) : (
            /* Grille de demandes DJ — 1 col mobile, 2 col grand desktop */
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 pb-12">
              {filteredRequests.length === 0 && (
                <div className="xl:col-span-2 text-center py-20 text-gray-600 space-y-2">
                  <Music2 className="w-10 h-10 mx-auto opacity-20" />
                  <p className="text-sm">
                    {filter === 'paid' ? 'Aucune demande en attente' : 'Aucune demande dans cette catégorie'}
                  </p>
                </div>
              )}
              {filteredRequests.map(req => (
                <RequestCard
                  key={req.id}
                  request={req}
                  onApprove={() => updateRequest(req.id, 'approved')}
                  onReject={() => updateRequest(req.id, 'rejected')}
                  onPlayed={() => updateRequest(req.id, 'played')}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showQR && session && <QRModal session={session} onClose={() => setShowQR(false)} />}

      {showBlacklist && session && (
        <BlacklistModal
          sessionId={session.id}
          price={(session as any).price_blacklist ?? 1000}
          onPriceChange={cents => updateConfig({ price_blacklist: cents })}
          onClose={() => setShowBlacklist(false)}
        />
      )}

      {showPromo && session && (
        <PromoCodesModal sessionId={session.id} onClose={() => setShowPromo(false)} />
      )}

      {/* Modale de configuration du mode visualisation */}
      {showViz && session && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) setShowViz(false) }}>
          <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-6 space-y-4 max-h-[92vh] overflow-y-auto my-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">📺 Mode visualisation</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">beta</span>
              </div>
              <button onClick={() => setShowViz(false)} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition">✕</button>
            </div>
            <p className="text-gray-500 text-xs">Affichez la soirée sur un écran et laissez le public interagir.</p>

            <div className="space-y-3 pt-1">
              <ConfigToggle label="Écran d'affichage" checked={!!(session as any).display_enabled} onChange={v => updateConfig({ display_enabled: v })} />
              <ConfigToggle label="Messages du public" checked={!!(session as any).messages_enabled} onChange={v => updateConfig({ messages_enabled: v })} />
              <ConfigToggle label="Super messages (payant)" checked={!!(session as any).super_messages_enabled} onChange={v => updateConfig({ super_messages_enabled: v })} />
            </div>

            {/* Prix super message */}
            {(session as any).super_messages_enabled && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-sm text-gray-300">Prix super message</span>
                <div className="relative w-24">
                  <input
                    key={'sp' + session.id}
                    type="number" min="0" step="0.5"
                    defaultValue={((session as any).price_super_message ?? 200) / 100}
                    onBlur={e => {
                      let cents = Math.round(parseFloat(e.target.value || '0') * 100)
                      if (isNaN(cents) || cents < 0) cents = 0
                      if (cents > 0 && cents < 50) cents = 50 // min Stripe si payant
                      e.target.value = String(cents / 100)
                      updateConfig({ price_super_message: cents })
                    }}
                    className="w-full pl-3 pr-6 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 transition"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                </div>
              </div>
            )}

            {/* Modération des messages (Perspective) */}
            {(session as any).messages_enabled && (
              <div className="space-y-2 pt-1 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Sévérité de la modération</span>
                  <span className="text-xs text-gray-500">seuil {(session as any).toxicity_threshold ?? 70}%</span>
                </div>
                <input
                  type="range" min="30" max="95" step="5"
                  value={(session as any).toxicity_threshold ?? 70}
                  onChange={e => updateConfig({ toxicity_threshold: Number(e.target.value) })}
                  className="w-full accent-purple-500"
                />
                <div className="flex justify-between text-[11px] text-gray-600">
                  <span>Strict</span><span>Permissif</span>
                </div>
                <p className="text-gray-600 text-[11px]">Plus le seuil est bas, plus les messages limites sont bloqués (analyse de toxicité Google Perspective).</p>
              </div>
            )}

            {/* Thème */}
            {(session as any).display_enabled && (
              <div className="space-y-2 pt-1 border-t border-white/5">
                <label className="text-gray-500 text-xs">Thème</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {DISPLAY_THEMES.map(t => (
                    <button key={t.id} type="button"
                      onClick={() => updateConfig({ display_theme: t.id, display_bg: t.bg, display_color1: t.c1, display_color2: t.c2, display_emojis: t.emojis.join(',') })}
                      className={cn('rounded-xl p-2 text-xs font-medium border transition relative overflow-hidden',
                        (session as any).display_theme === t.id ? 'border-purple-500/50 text-white' : 'border-white/10 text-gray-400 hover:text-white')}
                      style={{ background: `linear-gradient(135deg, ${t.c1}33, ${t.c2}22)` }}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Couleurs */}
            {(session as any).display_enabled && (
              <div className="flex items-center gap-4 pt-1">
                <label className="text-gray-500 text-xs">Couleurs</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={(session as any).display_color1 || '#a855f7'}
                    onChange={e => updateConfig({ display_color1: e.target.value })}
                    className="w-8 h-8 rounded-lg bg-transparent border border-white/10 cursor-pointer" />
                  <input type="color" value={(session as any).display_color2 || '#ec4899'}
                    onChange={e => updateConfig({ display_color2: e.target.value })}
                    className="w-8 h-8 rounded-lg bg-transparent border border-white/10 cursor-pointer" />
                </div>
              </div>
            )}

            {/* Emojis */}
            {(session as any).display_enabled && (
              <div className="space-y-2 pt-1">
                <label className="text-gray-500 text-xs">Emojis ({currentEmojis.length}/8) — cliquez pour activer/désactiver</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_PALETTE.map(em => {
                    const active = currentEmojis.includes(em)
                    return (
                      <button key={em} type="button"
                        onClick={() => {
                          let next = active ? currentEmojis.filter(x => x !== em) : [...currentEmojis, em]
                          if (next.length === 0) return
                          if (next.length > 8) next = next.slice(0, 8)
                          updateConfig({ display_emojis: next.join(',') })
                        }}
                        className={cn('w-9 h-9 rounded-lg text-lg flex items-center justify-center transition border',
                          active ? 'bg-purple-600/30 border-purple-500/40' : 'bg-white/5 border-white/10 opacity-50 hover:opacity-100')}>
                        {em}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Fond animé */}
            {(session as any).display_enabled && (
              <div className="space-y-1.5 pt-1">
                <label className="text-gray-500 text-xs">Animation de fond</label>
                <select
                  value={(session as any).display_bg ?? 'waves'}
                  onChange={e => updateConfig({ display_bg: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 transition"
                >
                  <option value="waves">Vagues</option>
                  <option value="pulse">Pulse</option>
                  <option value="particles">Particules</option>
                  <option value="aurora">Aurore</option>
                  <option value="neon">Néon</option>
                </select>
              </div>
            )}

            {/* Infos affichées sur l'écran */}
            {(session as any).display_enabled && (
              <div className="space-y-3 pt-1 border-t border-white/5">
                <p className="text-gray-500 text-xs">Informations affichées</p>
                <ConfigToggle label="Nom du DJ" checked={(session as any).display_show_dj !== false} onChange={v => updateConfig({ display_show_dj: v })} />
                <ConfigToggle label="Lieu de la soirée" checked={(session as any).display_show_venue !== false} onChange={v => updateConfig({ display_show_venue: v })} />
              </div>
            )}

            {(session as any).display_enabled && (
              <a href={`/display/${id}`} target="_blank" rel="noopener noreferrer"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-sm font-semibold transition flex items-center justify-center gap-2">
                Ouvrir l&apos;affichage ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* Modal prix */}
      {showPrices && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-6 sm:pb-0"
          onClick={e => e.target === e.currentTarget && setShowPrices(false)}>
          <div className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-3xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="font-bold">Modifier les prix</h2>
              <p className="text-gray-500 text-xs mt-0.5">Affecte les nouvelles demandes uniquement</p>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-blue-300">🎵 Dans la playlist (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editNormal}
                  onChange={e => setEditNormal(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-purple-300">⚡ La chanson maintenant (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editPriority}
                  onChange={e => setEditPriority(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 transition"
                />
              </div>
              <p className="text-gray-600 text-xs">0€ = gratuit, sans paiement</p>
              {parseFloat(editPriority) > 0 && parseFloat(editPriority) <= parseFloat(editNormal) && (
                <p className="text-red-400 text-xs">Le prix &quot;Maintenant&quot; doit être supérieur au prix &quot;Playlist&quot;</p>
              )}
              {priceError && <p className="text-red-400 text-xs">{priceError}</p>}
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setShowPrices(false)} className="flex-1 py-3 rounded-2xl glass text-gray-400 hover:text-white transition text-sm font-medium">
                Annuler
              </button>
              <button
                onClick={savePrices}
                disabled={savingPrices || (parseFloat(editPriority) > 0 && parseFloat(editPriority) <= parseFloat(editNormal))}
                className="flex-1 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 font-semibold text-sm flex items-center justify-center gap-2 transition"
              >
                {savingPrices && <Loader2 className="w-4 h-4 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants modal */}
      {showParticipants && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-6 sm:pb-0"
          onClick={e => e.target === e.currentTarget && setShowParticipants(false)}>
          <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Participants</h2>
                <p className="text-gray-500 text-xs mt-0.5">{participants.filter(p => p.email).length} email{participants.filter(p => p.email).length > 1 ? 's' : ''} collecté{participants.filter(p => p.email).length > 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                {participants.filter(p => p.email).length > 0 && (
                  <button
                    onClick={exportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-medium transition"
                  >
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                )}
                <button onClick={() => setShowParticipants(false)} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loadingParticipants ? (
                <div className="py-12 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                </div>
              ) : participants.length === 0 ? (
                <div className="py-12 text-center text-gray-600 space-y-1">
                  <Users className="w-8 h-8 mx-auto opacity-20" />
                  <p className="text-sm">Aucun participant pour l&apos;instant</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {participants.map((p, i) => (
                    <li key={i} className="px-5 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400 flex-shrink-0">
                        {p.name ? p.name[0].toUpperCase() : '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        {p.email ? (
                          <>
                            <p className="text-sm font-medium truncate">{p.email}</p>
                            {p.name && <p className="text-gray-500 text-xs truncate">{p.name}</p>}
                          </>
                        ) : (
                          <p className="text-gray-500 text-sm italic">{p.name ?? 'Invité anonyme'}</p>
                        )}
                      </div>
                      {p.anonymous && (
                        <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0">anonyme</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function StatMini({ value, label, color }: { value: string; label: string; color: string }) {
  const colors: Record<string, string> = {
    green: 'text-green-300',
    purple: 'text-purple-300',
    blue: 'text-blue-300',
    gray: 'text-gray-400',
  }
  return (
    <div className="glass rounded-xl p-2.5 text-center">
      <p className={cn('font-black text-lg leading-none', colors[color])}>{value}</p>
      <p className="text-gray-600 text-xs mt-1 leading-none">{label}</p>
    </div>
  )
}

function ConfigToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="w-full flex items-center justify-between gap-3 text-left">
      <span className="text-sm text-gray-300">{label}</span>
      <span className={cn('w-9 h-5 rounded-full p-0.5 transition flex-shrink-0', checked ? 'bg-purple-500' : 'bg-white/10')}>
        <span className={cn('block w-4 h-4 rounded-full bg-white transition-transform', checked ? 'translate-x-4' : 'translate-x-0')} />
      </span>
    </button>
  )
}

function RequestCard({ request, onApprove, onReject, onPlayed }: {
  request: Request
  onApprove: () => void
  onReject: () => void
  onPlayed: () => void
}) {
  const isPending = request.status === 'paid'
  const isApproved = request.status === 'approved'
  const isPriority = request.request_type === 'priority'
  const isBlacklist = request.request_type === 'blacklist'

  const timeAgo = (() => {
    const diff = Date.now() - new Date(request.created_at).getTime()
    const min = Math.floor(diff / 60000)
    if (min === 0) return 'À l\'instant'
    if (min === 1) return 'Il y a 1 min'
    return `Il y a ${min} min`
  })()

  return (
    <div className={cn(
      'rounded-2xl p-4 space-y-3 border transition-all animate-slide-in',
      isPending && isPriority
        ? 'bg-gradient-to-br from-purple-900/30 to-pink-900/10 border-purple-500/40'
        : isPending
          ? 'bg-white/4 border-white/12'
          : 'glass border-transparent'
    )}>
      <div className="flex gap-3">
        {request.album_image ? (
          <img src={request.album_image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow-lg" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
            <Music2 className="w-6 h-6 text-gray-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-bold truncate leading-tight">{request.song_name}</p>
              <p className="text-gray-400 text-sm truncate">{request.artist}</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={cn(
                'text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1',
                isBlacklist ? 'bg-red-500/25 text-red-200' : isPriority ? 'bg-purple-500/25 text-purple-200' : 'bg-blue-500/20 text-blue-300'
              )}>
                {isBlacklist ? <>🔥 INTERDIT</> : isPriority ? <><Zap className="w-3 h-3" /> MAINTENANT</> : <><Clock className="w-3 h-3" /> PLAYLIST</>}
              </span>
              <span className="text-green-300 font-black text-sm">{formatPrice(request.amount)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-500 text-xs font-medium">{request.customer_name}</span>
            <span className="text-gray-700 text-xs">·</span>
            <span className="text-gray-600 text-xs">{timeAgo}</span>
            {request.status === 'approved' && <span className="text-blue-400 text-xs">· Validée</span>}
            {request.status === 'played' && <span className="text-green-400 text-xs">· Jouée</span>}
            {request.status === 'rejected' && <span className="text-red-400 text-xs">· Refusée{(request as any).refunded ? ' · Remboursé ✓' : ''}</span>}
          </div>
        </div>
      </div>

      {request.message && (
        <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/5">
          <p className="text-gray-300 text-sm italic leading-snug">&ldquo;{request.message}&rdquo;</p>
        </div>
      )}

      <MusicLinks requestId={request.id} cached={request.music_links} />

      {isPending && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onApprove}
            className="py-3 rounded-xl bg-green-600/20 border border-green-500/35 text-green-300 hover:bg-green-600/35 font-semibold text-sm flex items-center justify-center gap-1.5 transition active:scale-[0.97]"
          >
            <Check className="w-4 h-4" /> Valider
          </button>
          <button
            onClick={onReject}
            className="py-3 rounded-xl bg-red-600/15 border border-red-500/25 text-red-400 hover:bg-red-600/25 font-semibold text-sm flex items-center justify-center gap-1.5 transition active:scale-[0.97]"
          >
            <X className="w-4 h-4" /> Refuser
          </button>
        </div>
      )}

      {isApproved && (
        <button
          onClick={onPlayed}
          className="w-full py-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 font-semibold text-sm flex items-center justify-center gap-1.5 transition active:scale-[0.97]"
        >
          <Play className="w-4 h-4" /> Marquer comme jouée
        </button>
      )}
    </div>
  )
}
