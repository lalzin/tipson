'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import {
  Search, Loader2, ArrowLeft, X, Mic2, Music2,
  ChevronRight, ShieldCheck, Clock, Users, Zap, User as UserIcon
} from 'lucide-react'
import type { Session, SearchTrack, Request } from '@/types'
import { cn, formatPrice } from '@/lib/utils'
import dynamic from 'next/dynamic'

const StripePaymentForm = dynamic(() => import('@/components/StripePaymentForm'), { ssr: false })

type KaraokeStep = 'search' | 'select-option' | 'form' | 'payment' | 'queue'

interface Props {
  session: Session & { profiles: { dj_name: string; paypal_me_url: string | null } }
  user: User | null
  guestMode: boolean
  sessionId: string
}

export default function KaraokeView({ session, user, guestMode, sessionId }: Props) {
  const [step, setStep] = useState<KaraokeStep>('search')
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<SearchTrack[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<SearchTrack | null>(null)
  const [isPriority, setIsPriority] = useState(false)
  const [customerName, setCustomerName] = useState(
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || ''
  )
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [request, setRequest] = useState<Request | null>(null)
  const [queueAhead, setQueueAhead] = useState<number>(0)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Restaure depuis localStorage
  useEffect(() => {
    const savedId = localStorage.getItem(`tipson-karaoke-${sessionId}`)
    if (savedId) {
      fetch(`/api/requests/${savedId}/public`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && !['played', 'rejected'].includes(data.status)) {
            setRequest(data)
            setStep('queue')
          } else if (data) {
            localStorage.removeItem(`tipson-karaoke-${sessionId}`)
          }
        })
    }
  }, [sessionId])

  // Realtime: suivi de la demande + position dans la file.
  // Connexions coupées quand l'onglet est en arrière-plan (économie de data).
  useEffect(() => {
    if (!request || !session.id) return
    const supabase = createClient()
    let reqChannel: ReturnType<typeof supabase.channel> | null = null
    let queueChannel: ReturnType<typeof supabase.channel> | null = null

    function computeAhead(requests: Request[]) {
      const waiting = requests.filter(r =>
        r.status === 'paid' && r.queue_position !== null && r.queue_position < (request!.queue_position ?? 999)
      )
      setQueueAhead(waiting.length)
    }

    async function loadQueue() {
      const { data } = await supabase.from('requests')
        .select('id, status, queue_position')
        .eq('session_id', session.id)
        .in('status', ['paid', 'approved'])
      if (data) computeAhead(data as any)
    }

    function start() {
      if (reqChannel) return
      reqChannel = supabase
        .channel(`karaoke-req-${request!.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `id=eq.${request!.id}` },
          payload => setRequest(prev => prev ? { ...prev, ...(payload.new as Request) } : prev)
        )
        .subscribe()
      queueChannel = supabase
        .channel(`karaoke-queue-${session.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `session_id=eq.${session.id}` },
          () => loadQueue()
        )
        .subscribe()
      loadQueue()
    }
    function stop() {
      if (reqChannel) { supabase.removeChannel(reqChannel); reqChannel = null }
      if (queueChannel) { supabase.removeChannel(queueChannel); queueChannel = null }
    }

    function onVisibility() {
      if (document.hidden) stop()
      else start()
    }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => { document.removeEventListener('visibilitychange', onVisibility); stop() }
  }, [request?.id, request?.queue_position, session.id])

  const searchTracks = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setTracks([]); return }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setTracks(data.tracks || [])
    } finally { setSearchLoading(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchTracks(query), 400)
    return () => clearTimeout(t)
  }, [query, searchTracks])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTrack || !customerName.trim()) return
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
          album_image: selectedTrack.image,
          request_type: 'karaoke',
          is_priority: isPriority,
          message: message.trim() || null,
          customer_email: user?.email ?? null,
          customer_user_id: user?.id ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRequest(data)
      localStorage.setItem(`tipson-karaoke-${sessionId}`, data.id)
      if (currentPrice === 0) {
        await fetch(`/api/requests/${data.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'paid' }),
        })
        setRequest({ ...data, status: 'paid' })
        setStep('queue')
      } else {
        setStep('payment')
      }
    } catch (err) { alert('Erreur : ' + (err instanceof Error ? err.message : String(err))) }
    finally { setSubmitting(false) }
  }

  function resetFlow() {
    localStorage.removeItem(`tipson-karaoke-${sessionId}`)
    setStep('search'); setSelectedTrack(null); setIsPriority(false); setQuery(''); setTracks([]); setMessage(''); setRequest(null)
    setCancelled(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  async function cancelRequest() {
    if (!request) return
    if (!confirm('Annuler définitivement votre passage ? Votre paiement sera annulé et vous quitterez la file.')) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/requests/${request.id}/cancel`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      localStorage.removeItem(`tipson-karaoke-${sessionId}`)
      setShowCancel(false)
      setCancelled(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Annulation impossible.')
    } finally {
      setCancelling(false)
    }
  }

  const currentPrice = isPriority ? session.price_karaoke_priority : session.price_karaoke
  const hasPriorityOption = session.express_enabled !== false && (session.price_karaoke_priority ?? 0) > 0
  const sessionEnded = session.status === 'ended'
  const sessionPaused = session.status === 'paused'

  // ── SESSION TERMINÉE ou EN PAUSE ────────────────────────────────────
  if (sessionEnded || sessionPaused) {
    // L'utilisateur avait rejoint la file (sa demande peut avoir été passée en
    // 'rejected' par le remboursement automatique lors de la clôture)
    const wasInQueue = !!request && request.status !== 'played'
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-gray-950 to-gray-950 text-center">
        <div className="w-full max-w-md space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-gray-800/60 border border-white/10 flex items-center justify-center mx-auto">
            <span className="text-4xl">{sessionPaused ? '⏸️' : '🎤'}</span>
          </div>
          <div>
            {sessionPaused ? (
              <>
                <h2 className="text-2xl font-bold">Soirée en pause</h2>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                  {wasInQueue
                    ? <>Votre place dans la file est conservée.<br />L&apos;animateur reprend bientôt, restez là !</>
                    : <>Le karaoké est momentanément suspendu.<br />L&apos;animateur reprendra bientôt !</>
                  }
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold">Soirée terminée</h2>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                  {wasInQueue
                    ? <>
                        Vous étiez dans la file mais la soirée s&apos;est terminée.<br />
                        Nous nous en excusons{request && request.amount > 0 ? ' — vous n\'avez pas été débité' : ''}.
                      </>
                    : <>Le karaoké est maintenant terminé.<br />Merci d&apos;avoir participé, on espère vous revoir bientôt !</>
                  }
                </p>
              </>
            )}
          </div>
          {wasInQueue && request && (
            <div className="glass rounded-2xl p-3 flex gap-3 items-center text-left border border-white/5">
              {request.album_image && <img src={request.album_image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />}
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{request.song_name}</p>
                <p className="text-gray-400 text-xs truncate">{request.artist}</p>
              </div>
            </div>
          )}
          <div className="glass rounded-2xl p-4 border border-white/5">
            <p className="text-gray-500 text-sm">{session.name}</p>
          </div>
        </div>
      </main>
    )
  }

  // ── CONFIRMATION D'ANNULATION ────────────────────────────────────────
  if (step === 'queue' && cancelled) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gray-950 text-center">
        <div className="w-full max-w-md space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-gray-800/60 border border-white/10 flex items-center justify-center mx-auto">
            <span className="text-4xl">✓</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Passage annulé</h2>
            <p className="text-gray-400 text-sm mt-2">
              Vous avez quitté la file. Aucun montant ne sera prélevé.
            </p>
          </div>
          <button onClick={resetFlow}
            className="w-full py-3 rounded-2xl bg-pink-600/20 border border-pink-500/30 text-pink-300 hover:bg-pink-600/30 font-medium transition">
            Rejoindre à nouveau
          </button>
        </div>
      </main>
    )
  }

  // ── QUEUE TRACKING ───────────────────────────────────────────────────
  if (step === 'queue' && request) {
    const isSinging = request.status === 'approved'
    const isDone = request.status === 'played'
    const isSkipped = request.status === 'rejected'
    const myPosition = queueAhead + 1

    return (
      <main className={cn(
        'min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b text-center',
        isSinging ? 'from-pink-950/40 via-gray-950 to-gray-950'
          : isDone ? 'from-purple-950/30 via-gray-950 to-gray-950'
          : isSkipped ? 'from-red-950/20 via-gray-950 to-gray-950'
          : 'from-gray-950 via-gray-950 to-gray-950'
      )}>
        <div className="w-full max-w-md space-y-6">
          {/* Statut principal */}
          {isSinging ? (
            <div className="space-y-3">
              <div className="w-24 h-24 rounded-3xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center mx-auto animate-pulse">
                <Mic2 className="w-12 h-12 text-pink-400" />
              </div>
              <div>
                <p className="text-pink-300 text-sm font-semibold uppercase tracking-widest">C&apos;est votre tour !</p>
                <h2 className="text-3xl font-black mt-1">🎤 À vous !</h2>
                <p className="text-gray-400 text-sm mt-1">Montez sur scène et chantez !</p>
              </div>
            </div>
          ) : isDone ? (
            <div className="space-y-3">
              <div className="w-24 h-24 rounded-3xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto">
                <span className="text-5xl">🎉</span>
              </div>
              <div>
                <h2 className="text-3xl font-black">Bravo !</h2>
                <p className="text-gray-400 text-sm mt-1">Vous avez assuré 🎵</p>
              </div>
            </div>
          ) : isSkipped ? (
            <div className="space-y-3">
              <div className="w-20 h-20 rounded-3xl bg-gray-800 flex items-center justify-center mx-auto">
                <span className="text-4xl">😔</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Passé</h2>
                <p className="text-gray-400 text-sm mt-1">Vous avez été passé cette fois</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                  <span className="text-5xl font-black text-white">#{myPosition}</span>
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm uppercase tracking-widest">Votre position</p>
                <h2 className="text-2xl font-bold mt-0.5">
                  {queueAhead === 0 ? 'Vous êtes le prochain !' : `${queueAhead} personne${queueAhead > 1 ? 's' : ''} avant vous`}
                </h2>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-600 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Mise à jour en temps réel
              </div>
            </div>
          )}

          {/* Carte du morceau */}
          <div className="glass rounded-2xl p-4 text-left space-y-3">
            <div className="flex gap-3 items-center">
              {request.album_image && (
                <img src={request.album_image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-semibold truncate">{request.song_name}</p>
                <p className="text-gray-400 text-sm truncate">{request.artist}</p>
                <p className="text-gray-500 text-xs mt-0.5">{request.customer_name}</p>
              </div>
            </div>
          </div>

          {(isDone || isSkipped) && !sessionEnded && (
            <button onClick={resetFlow}
              className="w-full py-3 rounded-2xl bg-pink-600/20 border border-pink-500/30 text-pink-300 hover:bg-pink-600/30 font-medium transition">
              Rejoindre à nouveau la file
            </button>
          )}

          {/* Annulation (rétractation) — discret, en deux temps, seulement en attente */}
          {request.status === 'paid' && (
            <div className="pt-1">
              {!showCancel ? (
                <button onClick={() => setShowCancel(true)}
                  className="text-gray-700 hover:text-gray-500 text-xs underline underline-offset-2 transition">
                  Un imprévu ?
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-500 text-xs max-w-xs mx-auto">
                    Vous pouvez quitter la file tant que vous n&apos;avez pas été appelé. Votre paiement sera annulé.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setShowCancel(false)} className="text-gray-500 hover:text-gray-300 text-xs transition">
                      Rester
                    </button>
                    <button onClick={cancelRequest} disabled={cancelling}
                      className="text-red-400/80 hover:text-red-400 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 transition">
                      {cancelling && <Loader2 className="w-3 h-3 animate-spin" />}
                      Quitter la file
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    )
  }

  // ── SELECT OPTION (si prix prioritaire configuré) ────────────────────
  if (step === 'select-option' && selectedTrack) {
    return (
      <main className="min-h-screen flex flex-col px-6 pt-12 pb-8 bg-gradient-to-b from-gray-950 via-pink-950/10 to-gray-950">
        <button onClick={() => setStep('search')} className="flex items-center gap-1 text-gray-400 hover:text-white mb-8 transition text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="flex-1 flex flex-col space-y-6 max-w-md mx-auto w-full">
          <div>
            <h2 className="text-2xl font-bold">Comment rejoindre ?</h2>
            <p className="text-gray-400 text-sm mt-1">Choisissez votre option</p>
          </div>

          <div className="glass rounded-2xl p-3 flex gap-3 items-center">
            {selectedTrack.image && <img src={selectedTrack.image} alt="" className="w-12 h-12 rounded-xl object-cover" />}
            <div className="min-w-0">
              <p className="font-medium truncate text-sm">{selectedTrack.name}</p>
              <p className="text-gray-400 text-xs truncate">{selectedTrack.artist}</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* File normale */}
            <button
              onClick={() => { setIsPriority(false); setStep('form') }}
              className="w-full glass rounded-2xl p-5 text-left hover:bg-white/8 border hover:border-pink-500/40 transition active:scale-[0.98] group"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/20 flex items-center justify-center flex-shrink-0">
                    <Mic2 className="w-6 h-6 text-pink-400" />
                  </div>
                  <div>
                    <p className="font-bold text-base">File normale</p>
                    <p className="text-gray-400 text-sm mt-0.5">Rejoindre la queue dans l&apos;ordre</p>
                  </div>
                </div>
                <p className="font-black text-2xl text-pink-300 flex-shrink-0">{formatPrice(session.price_karaoke)}</p>
              </div>
            </button>

            {/* Passer devant */}
            <button
              onClick={() => { setIsPriority(true); setStep('form') }}
              className="w-full rounded-2xl p-5 text-left transition active:scale-[0.98] group relative overflow-hidden border border-yellow-500/30 hover:border-yellow-400/50"
              style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.10) 0%, rgba(249,115,22,0.06) 100%)' }}
            >
              <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                PRIORITÉ
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-bold text-base">Passer devant</p>
                    <p className="text-gray-400 text-sm mt-0.5">Se placer en tête de file</p>
                  </div>
                </div>
                <p className="font-black text-2xl text-yellow-300 flex-shrink-0">{formatPrice(session.price_karaoke_priority)}</p>
              </div>
            </button>
          </div>

          <p className="text-center text-gray-600 text-xs">
            Paiement sécurisé par Stripe · débité seulement si confirmé
          </p>
        </div>
      </main>
    )
  }

  // ── PAYMENT ─────────────────────────────────────────────────────────
  if (step === 'payment' && request) {
    return (
      <main className="min-h-screen flex flex-col px-6 pt-12 pb-8 bg-gradient-to-b from-gray-950 via-pink-950/10 to-gray-950">
        <button onClick={() => setStep('form')} className="flex items-center gap-1 text-gray-400 hover:text-white mb-8 transition text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="flex-1 flex flex-col items-center justify-center space-y-5 max-w-md mx-auto w-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Rejoindre la file</h2>
            <p className="text-gray-400 text-sm mt-1">Paiement pour entrer dans la file</p>
          </div>
          <div className="w-full glass rounded-2xl p-4 space-y-3">
            <div className="flex gap-3 items-center">
              {selectedTrack?.image && <img src={selectedTrack.image} alt="" className="w-14 h-14 rounded-xl object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{selectedTrack?.name}</p>
                <p className="text-gray-400 text-sm truncate">{selectedTrack?.artist}</p>
                <p className="text-gray-500 text-xs mt-0.5">{customerName}</p>
              </div>
            </div>
            <div className="border-t border-white/10 pt-3 flex justify-between items-center">
              <span className="text-gray-400 text-sm">
                {isPriority ? '⚡ Passer devant la file' : '🎤 Entrée dans la file'}
              </span>
              <span className={cn('font-bold text-xl', isPriority ? 'text-yellow-300' : '')}>{formatPrice(currentPrice)}</span>
            </div>
          </div>
          <div className="w-full">
            <StripePaymentForm
              requestId={request.id}
              amount={currentPrice}
              onSuccess={() => { setRequest(prev => prev ? { ...prev, status: 'paid' } : prev); setStep('queue') }}
              onError={(err) => console.error(err)}
            />
          </div>
          <div className="flex items-center gap-2 text-gray-600 text-xs">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            Débité seulement si votre passage est confirmé
          </div>
        </div>
      </main>
    )
  }

  // ── FORM ────────────────────────────────────────────────────────────
  if (step === 'form') {
    return (
      <main className="min-h-screen flex flex-col px-6 pt-12 pb-8 bg-gradient-to-b from-gray-950 via-pink-950/10 to-gray-950">
        <button onClick={() => setStep('search')} className="flex items-center gap-1 text-gray-400 hover:text-white mb-8 transition text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="flex-1 flex flex-col space-y-5 max-w-md mx-auto w-full">
          <div>
            <h2 className="text-2xl font-bold">Votre inscription</h2>
            <p className={cn('text-sm mt-1', isPriority ? 'text-yellow-400' : 'text-gray-400')}>
              {isPriority ? `⚡ Passer devant · ${formatPrice(currentPrice)}` : `🎤 File normale · ${formatPrice(currentPrice)}`}
            </p>
          </div>
          {selectedTrack && (
            <div className="glass rounded-2xl p-3 flex gap-3 items-center">
              {selectedTrack.image && <img src={selectedTrack.image} alt="" className="w-12 h-12 rounded-xl object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate text-sm">{selectedTrack.name}</p>
                <p className="text-gray-400 text-xs truncate">{selectedTrack.artist}</p>
              </div>
              <button onClick={() => setStep('search')} className="text-gray-600 hover:text-gray-400 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4 flex-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Votre prénom *</label>
              <input
                type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                placeholder="Ex : Marie" required
                className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Message <span className="text-gray-600 font-normal">(optionnel)</span></label>
              <textarea
                value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Ex : C'est mon anniversaire !"
                rows={2}
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={!customerName.trim() || submitting}
              className={cn(
                'w-full py-4 rounded-2xl disabled:opacity-40 font-semibold text-lg flex items-center justify-center gap-2 transition active:scale-95',
                isPriority
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400'
                  : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500'
              )}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : isPriority ? <Zap className="w-5 h-5" /> : <Mic2 className="w-5 h-5" />}
              {currentPrice > 0 ? `Payer ${formatPrice(currentPrice)} & Rejoindre` : 'Rejoindre la file'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  // ── SEARCH ───────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col bg-gray-950">
      <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-white/5 px-5 sm:px-8 py-3.5">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-600/20 border border-pink-500/25 flex items-center justify-center">
              <Mic2 className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <p className="font-bold text-sm leading-none">{session.profiles?.dj_name ?? 'Hôte'}</p>
              <p className="text-gray-500 text-xs mt-0.5 leading-none">{session.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {user && (
              <a href="/account" title="Mon compte & participations"
                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 rounded-xl px-2.5 py-1.5 transition">
                <UserIcon className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-xs text-gray-300 max-w-[70px] truncate">
                  {user.email ? user.email.split('@')[0] : 'Compte'}
                </span>
              </a>
            )}
            <div className="flex items-center gap-1.5 bg-pink-500/10 rounded-xl px-2.5 py-1.5 border border-pink-500/20">
              <Mic2 className="w-3 h-3 text-pink-400" />
              <span className="text-pink-300 text-xs font-semibold">Karaoké</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 sm:px-8 pt-5 sm:pt-8 pb-8 max-w-2xl mx-auto w-full space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Quel son vous voulez chanter ?</h1>
          <p className="text-gray-400 text-sm sm:text-base mt-0.5">Recherchez un titre ou un artiste</p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
          <input
            ref={inputRef}
            type="search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Titre, artiste…" autoFocus
            className="w-full pl-12 pr-10 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 focus:bg-white/8 transition text-base"
          />
          {searchLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-500" />}
          {!searchLoading && query && (
            <button onClick={() => { setQuery(''); setTracks([]) }} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {tracks.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {tracks.map(track => (
              <button key={track.id}
                onClick={() => { setSelectedTrack(track); setStep(hasPriorityOption ? 'select-option' : 'form') }}
                className="w-full glass rounded-2xl p-3 flex gap-3 items-center hover:bg-white/8 active:scale-[0.98] transition text-left group">
                {track.image && <img src={track.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate text-sm">{track.name}</p>
                  <p className="text-gray-400 text-xs truncate">{track.artist}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0 group-hover:text-pink-400 transition" />
              </button>
            ))}
          </div>
        )}

        {!query && (
          <div className="text-center py-16 space-y-2 opacity-40">
            <Mic2 className="w-10 h-10 mx-auto text-pink-600" />
            <p className="text-gray-500 text-sm">Choisissez votre chanson</p>
          </div>
        )}
      </div>
    </main>
  )
}
