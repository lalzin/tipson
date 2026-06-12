'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import {
  Search, ChevronRight, Clock, Zap,
  ArrowLeft, X, Loader2, CheckCircle2,
  Music2, ListMusic, AlertCircle, ThumbsUp, ThumbsDown, ShieldCheck, LogOut, User as UserIcon
} from 'lucide-react'
import type { Session, SearchTrack, Request } from '@/types'
import { cn, formatPrice } from '@/lib/utils'
import dynamic from 'next/dynamic'
import AuthGate from '@/components/customer/AuthGate'
import KaraokeView from '@/components/customer/KaraokeView'
import InteractionBar from '@/components/customer/InteractionBar'

const StripePaymentForm = dynamic(() => import('@/components/StripePaymentForm'), { ssr: false })

type Step = 'search' | 'select-option' | 'form' | 'payment' | 'tracking'

interface SessionWithProfile extends Session {
  profiles: { dj_name: string; paypal_me_url: string | null }
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const [session, setSession] = useState<SessionWithProfile | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [user, setUser] = useState<User | null | undefined>(undefined) // undefined = loading
  const [guestMode, setGuestMode] = useState(false)

  const [step, setStep] = useState<Step>('search')
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<SearchTrack[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<SearchTrack | null>(null)
  const [requestType, setRequestType] = useState<'normal' | 'priority'>('normal')
  const [customerName, setCustomerName] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [request, setRequest] = useState<Request | null>(null)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function cancelRequest() {
    if (!request) return
    if (!confirm('Annuler définitivement votre demande ? Votre paiement sera annulé et le DJ ne la verra plus.')) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/requests/${request.id}/cancel`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      localStorage.removeItem(`tipson-req-${id}`)
      setShowCancel(false)
      setCancelled(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Annulation impossible.')
    } finally {
      setCancelling(false)
    }
  }

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let poll: ReturnType<typeof setInterval> | null = null

    const fetchSession = () =>
      fetch(`/api/sessions/public/${id}`, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setSession(prev => prev ? { ...prev, ...data } : data) })
        .catch(() => {})

    // Démarre temps réel + filet de sécurité (poll lent) — uniquement onglet visible
    function start() {
      if (channel) return
      channel = supabase
        .channel(`session-public-${id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${id}` },
          payload => setSession(prev => prev ? { ...prev, ...(payload.new as typeof prev) } : prev)
        )
        .subscribe()
      // Filet de sécurité espacé (30s) si le realtime n'est pas activé côté Supabase
      poll = setInterval(fetchSession, 30000)
    }
    function stop() {
      if (channel) { supabase.removeChannel(channel); channel = null }
      if (poll) { clearInterval(poll); poll = null }
    }

    // Chargement initial
    fetch(`/api/sessions/public/${id}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(setSession)
      .finally(() => setPageLoading(false))

    // Coupe tout quand l'onglet passe en arrière-plan, reprend au retour
    function onVisibility() {
      if (document.hidden) stop()
      else { start(); fetchSession() }
    }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => { document.removeEventListener('visibilitychange', onVisibility); stop() }
  }, [id])

  // Auth state + restore tracking depuis localStorage
  useEffect(() => {
    const supabase = createClient()
    // getSession() = lecture locale (aucune requête réseau au serveur Auth)
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null
      setUser(user)
      if (user) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || ''
        setCustomerName(name)
      }
      // Restaure le tracking si une demande en cours existe
      const savedId = localStorage.getItem(`tipson-req-${id}`)
      if (savedId) {
        fetch(`/api/requests/${savedId}/public`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data && !['rejected', 'played'].includes(data.status)) {
              setRequest(data)
              setStep('tracking')
            } else if (data && ['rejected', 'played'].includes(data.status)) {
              // Demande terminée, on retire du localStorage
              localStorage.removeItem(`tipson-req-${id}`)
            }
          })
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || ''
        setCustomerName(name)
      }
    })
    return () => subscription.unsubscribe()
  }, [id])

  // Suivi du statut de la demande : realtime (instantané) + poll de secours.
  // S'ARRÊTE dès que la demande est terminée et quand l'onglet est en arrière-plan.
  const reqId = request?.id
  const reqTerminal = request ? ['played', 'rejected'].includes(request.status) : true
  useEffect(() => {
    if (!reqId || reqTerminal) return
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let poll: ReturnType<typeof setInterval> | null = null

    const refetch = () =>
      fetch(`/api/requests/${reqId}/public`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setRequest(prev => prev ? { ...prev, ...d } : prev) })
        .catch(() => {})

    function start() {
      if (!channel) {
        channel = supabase
          .channel(`request-${reqId}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `id=eq.${reqId}` },
            payload => setRequest(prev => prev ? { ...prev, ...(payload.new as Request) } : prev)
          )
          .subscribe()
      }
      // Filet de sécurité si le realtime n'est pas activé sur la table (15s, visible uniquement)
      if (!poll) poll = setInterval(() => { if (!document.hidden) refetch() }, 15000)
    }
    function stop() {
      if (channel) { supabase.removeChannel(channel); channel = null }
      if (poll) { clearInterval(poll); poll = null }
    }

    function onVisibility() { if (document.hidden) stop(); else { start(); refetch() } }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => { document.removeEventListener('visibilitychange', onVisibility); stop() }
  }, [reqId, reqTerminal])

  const searchTracks = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setTracks([]); return }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setTracks(data.tracks || [])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchTracks(query), 400)
    return () => clearTimeout(t)
  }, [query, searchTracks])

  async function handleSubmit() {
    if (!session || !selectedTrack || !customerName.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          customer_name: customerName.trim(),
          song_name: selectedTrack.name,
          artist: selectedTrack.artist,
          spotify_uri: null,
          album_image: selectedTrack.image,
          itunes_url: selectedTrack.url,
          customer_email: user?.email ?? null,
          customer_user_id: user?.id ?? null,
          request_type: requestType,
          message: message.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRequest(data)
      // Persiste l'ID pour restaurer le tracking après refresh
      localStorage.setItem(`tipson-req-${id}`, data.id)
      // Si gratuit, on saute le paiement
      if (data.amount === 0) {
        await fetch(`/api/requests/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'paid' }),
        })
        setRequest({ ...data, status: 'paid' })
        setStep('tracking')
      } else {
        setStep('payment')
      }
    } catch {
      alert('Erreur lors de la demande, réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmPayment() {
    if (!request) return
    setConfirming(true)
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      })
      const updated = await res.json()
      setRequest(updated)
      setStep('tracking')
    } finally {
      setConfirming(false)
    }
  }

  function resetFlow() {
    localStorage.removeItem(`tipson-req-${id}`)
    setStep('search')
    setSelectedTrack(null)
    setQuery('')
    setTracks([])
    setMessage('')
    setRequest(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setCustomerName('')
  }

  if (pageLoading || user === undefined) {
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

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center space-y-4 bg-gray-950">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h2 className="text-xl font-semibold">Soirée introuvable</h2>
        <p className="text-gray-400 text-sm">Cette session n&apos;existe pas.</p>
        <a href="/join" className="text-purple-400 underline underline-offset-4 text-sm">Entrer un code</a>
      </div>
    )
  }

  const isInactive = session.status !== 'active'

  // ─── KARAOKÉ : délègue toujours à KaraokeView (gère lui-même pause/fin + file) ───
  if (session.session_type === 'karaoke') {
    // Session fermée/pause → pas besoin d'auth, KaraokeView affiche le message
    if (!isInactive && !user && !guestMode) {
      return (
        <AuthGate
          sessionName={session.name}
          djName={session.profiles?.dj_name ?? 'DJ'}
          onAuth={() => setGuestMode(true)}
        />
      )
    }
    return (
      <KaraokeView
        session={session}
        user={user ?? null}
        guestMode={guestMode}
        sessionId={id}
      />
    )
  }

  // ─── SESSION DJ INACTIVE (ended ou paused) — avant l'auth ───────────
  if (isInactive) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-gray-950 to-gray-950 text-center">
        <div className="w-full max-w-md space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-gray-800/60 border border-white/10 flex items-center justify-center mx-auto">
            <span className="text-4xl">{session.status === 'paused' ? '⏸️' : '🎧'}</span>
          </div>
          <div>
            {session.status === 'paused' ? (
              <>
                <h2 className="text-2xl font-bold">Soirée en pause</h2>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                  Le DJ fait une courte pause.<br />
                  Les demandes reprendront bientôt !
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold">Soirée terminée</h2>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                  La soirée est maintenant terminée.<br />
                  Merci d&apos;avoir été là, à très bientôt !
                </p>
              </>
            )}
          </div>
          <div className="glass rounded-2xl p-4 border border-white/5">
            <p className="text-gray-500 text-sm">{session.name}</p>
          </div>
        </div>
      </main>
    )
  }

  // Affiche l'AuthGate si non connecté et pas en mode invité
  if (!user && !guestMode) {
    return (
      <AuthGate
        sessionName={session.name}
        djName={session.profiles?.dj_name ?? 'DJ'}
        onAuth={() => setGuestMode(true)}
      />
    )
  }

  const amount = requestType === 'priority' ? session.price_priority : session.price_normal
  const amountEur = formatPrice(amount)

  // ─── TRACKING ─────────────────────────────────────────────────────
  // Écran de confirmation après annulation par le client
  if (step === 'tracking' && cancelled) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gray-950 text-center">
        <div className="w-full max-w-md space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-gray-800/60 border border-white/10 flex items-center justify-center mx-auto">
            <span className="text-4xl">✓</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Demande annulée</h2>
            <p className="text-gray-400 text-sm mt-2">
              Votre demande a bien été annulée. Aucun montant ne sera prélevé.
            </p>
          </div>
          <button
            onClick={() => { setCancelled(false); resetFlow() }}
            className="w-full py-3 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 font-medium transition"
          >
            Faire une autre demande
          </button>
        </div>
      </main>
    )
  }

  if (step === 'tracking' && request) {
    const statusConfig = {
      paid: {
        icon: <Clock className="w-8 h-8 text-yellow-400" />,
        bg: 'from-yellow-950/30 via-gray-950 to-gray-950',
        badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        title: 'Demande reçue !',
        sub: 'Le DJ examine votre demande…',
      },
      approved: {
        icon: <ThumbsUp className="w-8 h-8 text-green-400" />,
        bg: 'from-green-950/30 via-gray-950 to-gray-950',
        badge: 'bg-green-500/20 text-green-300 border-green-500/30',
        title: 'Validée !',
        sub: request.request_type === 'priority'
          ? 'Votre son passe après le morceau en cours 🎵'
          : 'Votre son sera dans la playlist ce soir 🎉',
      },
      played: {
        icon: <CheckCircle2 className="w-8 h-8 text-purple-400" />,
        bg: 'from-purple-950/30 via-gray-950 to-gray-950',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        title: 'C\'est votre son !',
        sub: 'Le DJ est en train de passer votre morceau 🔊',
      },
      rejected: {
        icon: <ThumbsDown className="w-8 h-8 text-red-400" />,
        bg: 'from-red-950/20 via-gray-950 to-gray-950',
        badge: 'bg-red-500/20 text-red-300 border-red-500/30',
        title: 'Refusée',
        sub: request.amount > 0 ? 'Le DJ n\'a pas pu passer ce son. Vous n\'avez pas été débité.' : 'Le DJ n\'a pas pu passer ce son.',
      },
      pending_payment: {
        icon: <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />,
        bg: 'from-gray-950 via-gray-950 to-gray-950',
        badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
        title: 'En attente',
        sub: '',
      },
    }
    const cfg = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.paid

    return (
      <main className={cn('min-h-screen flex flex-col bg-gradient-to-b px-6 pt-12 pb-10', cfg.bg)}>
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 max-w-md mx-auto w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
            {cfg.icon}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{cfg.title}</h2>
            <p className="text-gray-400 text-sm mt-1">{cfg.sub}</p>
          </div>

          {/* Carte de la demande */}
          <div className="w-full glass rounded-2xl p-4 text-left space-y-3">
            <div className="flex gap-3 items-center">
              {request.album_image && (
                <img src={request.album_image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-semibold truncate">{request.song_name}</p>
                <p className="text-gray-400 text-sm truncate">{request.artist}</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <span className={cn('text-xs px-2.5 py-1 rounded-full border', cfg.badge)}>
                {request.status === 'paid' && '⏳ En attente de validation'}
                {request.status === 'approved' && '✓ Validée'}
                {request.status === 'played' && '🎵 Jouée'}
                {request.status === 'rejected' && '✗ Refusée'}
              </span>
              <span className="text-gray-400 text-xs">
                {request.request_type === 'priority' ? '⚡ La chanson maintenant' : '🎵 Dans la playlist'}
              </span>
            </div>
          </div>

          {/* Indicateur temps réel */}
          {request.status === 'paid' && (
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Mise à jour en temps réel
            </div>
          )}

          {/* Annulation (rétractation) — volontairement discret, en deux temps */}
          {request.status === 'paid' && (
            <div className="pt-2">
              {!showCancel ? (
                <button
                  onClick={() => setShowCancel(true)}
                  className="text-gray-700 hover:text-gray-500 text-xs underline underline-offset-2 transition"
                >
                  Un problème avec votre demande ?
                </button>
              ) : (
                <div className="space-y-2 text-center">
                  <p className="text-gray-500 text-xs max-w-xs mx-auto">
                    Vous pouvez annuler votre demande tant que le DJ ne l&apos;a pas validée.
                    Votre paiement sera annulé.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setShowCancel(false)} className="text-gray-500 hover:text-gray-300 text-xs transition">
                      Garder
                    </button>
                    <button
                      onClick={cancelRequest}
                      disabled={cancelling}
                      className="text-red-400/80 hover:text-red-400 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 transition"
                    >
                      {cancelling && <Loader2 className="w-3 h-3 animate-spin" />}
                      Annuler ma demande
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {(request.status === 'rejected' || request.status === 'played') && (
            <button
              onClick={resetFlow}
              className="w-full py-3 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 font-medium transition"
            >
              Faire une autre demande
            </button>
          )}
        </div>
      </main>
    )
  }

  // ─── PAYMENT ──────────────────────────────────────────────────────
  if (step === 'payment') {
    return (
      <main className="min-h-screen flex flex-col px-6 pt-12 pb-8 bg-gradient-to-b from-gray-950 via-purple-950/10 to-gray-950">
        <button onClick={() => setStep('form')} className="flex items-center gap-1 text-gray-400 hover:text-white mb-8 transition text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="flex-1 flex flex-col items-center justify-center space-y-5 max-w-md mx-auto w-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Paiement sécurisé</h2>
            <p className="text-gray-400 text-sm mt-1">Remboursement automatique si refusé</p>
          </div>

          {/* Récap */}
          <div className="w-full glass rounded-2xl p-4 space-y-3">
            <div className="flex gap-3 items-center">
              {selectedTrack?.image && (
                <img src={selectedTrack.image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{selectedTrack?.name}</p>
                <p className="text-gray-400 text-sm truncate">{selectedTrack?.artist}</p>
                <p className="text-gray-500 text-xs mt-0.5">{customerName}</p>
              </div>
            </div>
            <div className="border-t border-white/10 pt-3 flex justify-between items-center">
              <span className="text-gray-400 text-sm">
                {requestType === 'priority' ? '⚡ La chanson maintenant' : '🎵 Dans la playlist'}
              </span>
              <span className="font-bold text-xl text-white">{amountEur}</span>
            </div>
          </div>

          {/* Paiement Stripe */}
          {request && (
            <div className="w-full">
              <StripePaymentForm
                requestId={request.id}
                amount={amount}
                onSuccess={(updated) => {
                  setRequest(updated as Request)
                  setStep('tracking')
                }}
                onError={(err) => console.error(err)}
              />
            </div>
          )}

          {/* Garantie */}
          <div className="flex items-center gap-2 text-gray-600 text-xs">
            <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
            Vous n&apos;êtes débité que si le DJ accepte votre son
          </div>
        </div>
      </main>
    )
  }

  // ─── FORM ─────────────────────────────────────────────────────────
  if (step === 'form') {
    return (
      <main className="min-h-screen flex flex-col px-6 pt-8 pb-8 bg-gradient-to-b from-gray-950 via-purple-950/10 to-gray-950">
        <button onClick={() => setStep('select-option')} className="flex items-center gap-1 text-gray-400 hover:text-white mb-5 transition text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="flex flex-col space-y-5 max-w-md mx-auto w-full">
          <div>
            <h2 className="text-2xl font-bold">Votre demande</h2>
            <p className="text-gray-400 text-sm mt-1">
              {requestType === 'priority'
                ? <span>⚡ <strong className="text-white">La chanson maintenant</strong> · <span className="text-purple-300">{amountEur}</span></span>
                : <span>🎵 <strong className="text-white">Dans la playlist</strong> · <span className="text-blue-300">{amountEur}</span></span>
              }
            </p>
          </div>

          {selectedTrack && (
            <div className="glass rounded-2xl p-3 flex gap-3 items-center">
              {selectedTrack.image && (
                <img src={selectedTrack.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate text-sm">{selectedTrack.name}</p>
                <p className="text-gray-400 text-xs truncate">{selectedTrack.artist}</p>
              </div>
              <button onClick={() => setStep('search')} className="text-gray-600 hover:text-gray-400 transition flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Votre prénom *</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Ex : Marie"
                className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:bg-white/8 transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">
                Message pour le DJ <span className="text-gray-600 font-normal">(optionnel)</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Ex : Pour l'anniversaire de Lucie !"
                rows={3}
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition resize-none"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!customerName.trim() || submitting}
            className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-lg flex items-center justify-center gap-2 transition active:scale-95"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {amount === 0 ? 'Valider ma demande →' : 'Continuer vers le paiement →'}
          </button>
        </div>
      </main>
    )
  }

  // ─── SELECT OPTION ────────────────────────────────────────────────
  if (step === 'select-option') {
    return (
      <main className="min-h-screen flex flex-col px-6 pt-12 pb-8 bg-gradient-to-b from-gray-950 via-purple-950/10 to-gray-950">
        <button onClick={() => setStep('search')} className="flex items-center gap-1 text-gray-400 hover:text-white mb-8 transition text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="flex-1 flex flex-col space-y-6 max-w-md mx-auto w-full">
          <div>
            <h2 className="text-2xl font-bold">Choisissez votre option</h2>
            <p className="text-gray-400 text-sm mt-1">Quand voulez-vous entendre votre son ?</p>
          </div>

          {selectedTrack && (
            <div className="glass rounded-2xl p-3 flex gap-3 items-center">
              {selectedTrack.image && (
                <img src={selectedTrack.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
              )}
              <div className="min-w-0">
                <p className="font-medium truncate text-sm">{selectedTrack.name}</p>
                <p className="text-gray-400 text-xs truncate">{selectedTrack.artist}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {/* Option normale — 1€ */}
            <button
              onClick={() => { setRequestType('normal'); setStep('form') }}
              className="w-full glass rounded-2xl p-5 text-left hover:bg-white/8 border hover:border-blue-500/40 transition active:scale-[0.98] group"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <ListMusic className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-bold text-base">Dans la playlist</p>
                    <p className="text-gray-400 text-sm mt-0.5">Le DJ passe votre son ce soir</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-2xl text-blue-300">{formatPrice(session.price_normal)}</p>
                  <ChevronRight className="w-4 h-4 text-gray-600 ml-auto mt-0.5 group-hover:text-blue-300 transition" />
                </div>
              </div>
            </button>

            {/* Option priorité — masquée si l'express est désactivé */}
            {session.express_enabled !== false && (
            <button
              onClick={() => { setRequestType('priority'); setStep('form') }}
              className="w-full rounded-2xl p-5 text-left transition active:scale-[0.98] group relative overflow-hidden border border-purple-500/30 hover:border-purple-400/50"
              style={{ background: 'linear-gradient(135deg, rgba(147,51,234,0.12) 0%, rgba(219,39,119,0.08) 100%)' }}
            >
              <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                PRIORITÉ
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-bold text-base">La chanson maintenant</p>
                    <p className="text-gray-400 text-sm mt-0.5">Passe après le morceau en cours</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-2xl text-purple-300">{formatPrice(session.price_priority)}</p>
                  <ChevronRight className="w-4 h-4 text-gray-600 ml-auto mt-0.5 group-hover:text-purple-300 transition" />
                </div>
              </div>
            </button>
            )}
          </div>

          <p className="text-center text-gray-600 text-xs">
            Paiement sécurisé par Stripe · débité seulement si le DJ accepte
          </p>
        </div>
      </main>
    )
  }

  // ─── SEARCH (défaut) ──────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col bg-gray-950">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-white/5 px-5 sm:px-8 py-3.5">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/25 flex items-center justify-center">
              <Music2 className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="font-bold text-sm leading-none">{session.profiles?.dj_name ?? 'DJ'}</p>
              <p className="text-gray-500 text-xs mt-0.5 leading-none">{session.name}</p>
            </div>
          </div>
          {/* Compte connecté */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-1.5">
                <a href="/account" title="Mon compte & participations"
                  className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 rounded-xl px-2.5 py-1.5 transition">
                  <UserIcon className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span className="text-xs text-gray-300 max-w-[80px] truncate">
                    {user.email ? user.email.split('@')[0] : user.user_metadata?.full_name ?? 'Mon compte'}
                  </span>
                </a>
                <button onClick={signOut} title="Se déconnecter" className="p-1.5 rounded-xl hover:bg-white/5 text-gray-600 hover:text-gray-400 transition">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : guestMode ? (
              <div className="flex items-center gap-1.5 bg-white/5 rounded-xl px-2.5 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-500 flex-shrink-0" />
                <span className="text-xs text-gray-500">Invité</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 sm:px-8 pt-5 sm:pt-8 pb-8 max-w-2xl mx-auto w-full space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Quel son vous voulez ?</h1>
          <p className="text-gray-400 text-sm sm:text-base mt-0.5">Recherchez un titre ou un artiste</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Titre, artiste, album…"
            autoFocus
            className="w-full pl-12 pr-10 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:bg-white/8 transition text-base"
          />
          {searchLoading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-500" />
          )}
          {!searchLoading && query && (
            <button onClick={() => { setQuery(''); setTracks([]) }} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Résultats */}
        {tracks.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {tracks.map(track => (
              <button
                key={track.id}
                onClick={() => {
                  setSelectedTrack(track)
                  // Si l'option express est désactivée, pas de choix → demande normale directe
                  if (session.express_enabled === false) { setRequestType('normal'); setStep('form') }
                  else setStep('select-option')
                }}
                className="w-full glass rounded-2xl p-3 flex gap-3 items-center hover:bg-white/8 active:scale-[0.98] transition text-left group"
              >
                {track.image && (
                  <img src={track.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate text-sm">{track.name}</p>
                  <p className="text-gray-400 text-xs truncate">{track.artist}</p>
                  <p className="text-gray-600 text-xs truncate">{track.album}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0 group-hover:text-white transition" />
              </button>
            ))}
          </div>
        )}

        {query.length >= 2 && !searchLoading && tracks.length === 0 && (
          <div className="text-center py-10 space-y-2">
            <p className="text-gray-500 text-sm">Aucun résultat pour &laquo;{query}&raquo;</p>
            <p className="text-gray-600 text-xs">Essayez avec l&apos;artiste ou le nom exact</p>
          </div>
        )}

        {!query && (
          <div className="text-center py-16 space-y-2 opacity-40">
            <Search className="w-10 h-10 mx-auto text-gray-600" />
            <p className="text-gray-500 text-sm">Recherchez votre son</p>
          </div>
        )}
      </div>

      {(session.display_enabled || session.messages_enabled) && (
        <InteractionBar
          sessionId={id}
          authorName={customerName}
          displayEnabled={!!session.display_enabled}
          messagesEnabled={!!session.messages_enabled}
          superEnabled={!!session.super_messages_enabled}
          superPrice={session.price_super_message ?? 200}
        />
      )}
    </main>
  )
}
