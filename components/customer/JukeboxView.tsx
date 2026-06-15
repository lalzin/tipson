'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Loader2, X, Music2, ListMusic, Check, ChevronRight, Disc3,
  ArrowLeft, Zap, ShieldCheck,
} from 'lucide-react'
import type { Session, SearchTrack, Request } from '@/types'
import { cn, formatPrice } from '@/lib/utils'
import dynamic from 'next/dynamic'

const StripePaymentForm = dynamic(() => import('@/components/StripePaymentForm'), { ssr: false })

type Step = 'search' | 'option' | 'payment' | 'done'
interface Added { id: string; name: string; artist: string; image: string | null; express?: boolean }

interface Props {
  session: Session & { profiles: { dj_name: string } }
  sessionId: string
}

export default function JukeboxView({ session, sessionId }: Props) {
  const [step, setStep] = useState<Step>('search')
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<SearchTrack[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selected, setSelected] = useState<SearchTrack | null>(null)
  const [isPriority, setIsPriority] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [request, setRequest] = useState<Request | null>(null)
  const [added, setAdded] = useState<Added[]>([])
  const [error, setError] = useState('')
  const [authorName, setAuthorName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const priceNormal = session.price_normal ?? 0
  const pricePriority = session.price_priority ?? 0
  const hasExpress = session.express_enabled !== false && pricePriority > 0
  const isPaid = priceNormal > 0 || (hasExpress && pricePriority > 0)

  useEffect(() => {
    setAuthorName(localStorage.getItem('tipson-pseudo') || '')
    try {
      const raw = localStorage.getItem(`tipson-jukebox-${sessionId}`)
      if (raw) setAdded(JSON.parse(raw))
    } catch {}
  }, [sessionId])

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

  function pushAdded(track: SearchTrack, express: boolean) {
    const entry: Added = { id: track.id, name: track.name, artist: track.artist, image: track.image, express }
    const next = [entry, ...added].slice(0, 20)
    setAdded(next)
    localStorage.setItem(`tipson-jukebox-${sessionId}`, JSON.stringify(next))
  }

  function chooseTrack(track: SearchTrack) {
    setSelected(track)
    setError('')
    if (hasExpress) { setStep('option') }
    else { addToQueue(track, false) }
  }

  async function addToQueue(track: SearchTrack, express: boolean) {
    setError(''); setSubmitting(true); setIsPriority(express)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/jukebox/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track_id: track.id,
          song_name: track.name,
          artist: track.artist,
          album_image: track.image,
          author_name: authorName.trim() || null,
          is_priority: express,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ajout impossible')
      if (authorName.trim()) localStorage.setItem('tipson-pseudo', authorName.trim())

      if (data.status === 'pending_payment' && data.amount > 0) {
        setRequest(data)
        setStep('payment')
      } else {
        pushAdded(track, express)
        finishAdd()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
      setStep('search')
    } finally { setSubmitting(false) }
  }

  function finishAdd() {
    setStep('done')
    setQuery(''); setTracks([])
    setTimeout(() => { setSelected(null); setRequest(null); setStep('search'); inputRef.current?.focus() }, 1600)
  }

  const sessionEnded = session.status === 'ended'
  const sessionPaused = session.status === 'paused'

  if (sessionEnded || sessionPaused) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gray-950 text-center">
        <div className="w-full max-w-md space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-gray-800/60 border border-white/10 flex items-center justify-center mx-auto">
            <span className="text-4xl">{sessionPaused ? '⏸️' : '🎶'}</span>
          </div>
          <h2 className="text-2xl font-bold">{sessionPaused ? 'Jukebox en pause' : 'Jukebox terminé'}</h2>
          <p className="text-gray-400 text-sm">
            {sessionPaused ? 'Reprise imminente, restez dans le coin !' : 'Merci d\'avoir participé à l\'ambiance 🎵'}
          </p>
          <div className="glass rounded-2xl p-4 border border-white/5">
            <p className="text-gray-500 text-sm">{session.name}</p>
          </div>
        </div>
      </main>
    )
  }

  // ── DONE (confirmation flash) ───────────────────────────────────────
  if (step === 'done') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-emerald-950/30 via-gray-950 to-gray-950 text-center">
        <div className="w-full max-w-md space-y-5">
          <div className="w-24 h-24 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <Check className="w-12 h-12 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-3xl font-black">Ajouté à la file ! 🎶</h2>
            <p className="text-gray-400 text-sm mt-1">{selected?.name} passera bientôt sur les enceintes</p>
          </div>
        </div>
      </main>
    )
  }

  // ── PAYMENT ─────────────────────────────────────────────────────────
  if (step === 'payment' && request && selected) {
    return (
      <main className="min-h-screen flex flex-col px-6 pt-12 pb-8 bg-gradient-to-b from-gray-950 via-emerald-950/10 to-gray-950">
        <button onClick={() => setStep(hasExpress ? 'option' : 'search')} className="flex items-center gap-1 text-gray-400 hover:text-white mb-8 transition text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="flex-1 flex flex-col items-center justify-center space-y-5 max-w-md mx-auto w-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Ajouter à la file</h2>
            <p className="text-gray-400 text-sm mt-1">{isPriority ? '⚡ Passer devant' : 'File normale'}</p>
          </div>
          <div className="w-full glass rounded-2xl p-4 space-y-3">
            <div className="flex gap-3 items-center">
              {selected.image && <img src={selected.image} alt="" className="w-14 h-14 rounded-xl object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{selected.name}</p>
                <p className="text-gray-400 text-sm truncate">{selected.artist}</p>
              </div>
            </div>
            <div className="border-t border-white/10 pt-3 flex justify-between items-center">
              <span className="text-gray-400 text-sm">{isPriority ? '⚡ Passer devant la file' : '🎶 Ajouter à la file'}</span>
              <span className={cn('font-bold text-xl', isPriority && 'text-yellow-300')}>{formatPrice(request.amount)}</span>
            </div>
          </div>
          <div className="w-full">
            <StripePaymentForm
              requestId={request.id}
              amount={request.amount}
              onSuccess={() => { pushAdded(selected, isPriority); finishAdd() }}
              onError={(err) => console.error(err)}
            />
          </div>
          <div className="flex items-center gap-2 text-gray-600 text-xs">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            Débité seulement à la confirmation
          </div>
        </div>
      </main>
    )
  }

  // ── OPTION (normale vs express) ─────────────────────────────────────
  if (step === 'option' && selected) {
    return (
      <main className="min-h-screen flex flex-col px-6 pt-12 pb-8 bg-gradient-to-b from-gray-950 via-emerald-950/10 to-gray-950">
        <button onClick={() => { setStep('search'); setSelected(null) }} className="flex items-center gap-1 text-gray-400 hover:text-white mb-8 transition text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="flex-1 flex flex-col space-y-6 max-w-md mx-auto w-full">
          <div>
            <h2 className="text-2xl font-bold">Comment l&apos;ajouter ?</h2>
            <p className="text-gray-400 text-sm mt-1">Choisissez votre option</p>
          </div>
          <div className="glass rounded-2xl p-3 flex gap-3 items-center">
            {selected.image && <img src={selected.image} alt="" className="w-12 h-12 rounded-xl object-cover" />}
            <div className="min-w-0">
              <p className="font-medium truncate text-sm">{selected.name}</p>
              <p className="text-gray-400 text-xs truncate">{selected.artist}</p>
            </div>
          </div>
          <div className="space-y-3">
            <button onClick={() => addToQueue(selected, false)} disabled={submitting}
              className="w-full glass rounded-2xl p-5 text-left hover:bg-white/8 border hover:border-emerald-500/40 transition active:scale-[0.98] disabled:opacity-50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <ListMusic className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-bold text-base">Ajouter à la file</p>
                    <p className="text-gray-400 text-sm mt-0.5">Passera dans l&apos;ordre</p>
                  </div>
                </div>
                <p className="font-black text-2xl text-emerald-300 flex-shrink-0">{priceNormal > 0 ? formatPrice(priceNormal) : 'Gratuit'}</p>
              </div>
            </button>
            <button onClick={() => addToQueue(selected, true)} disabled={submitting}
              className="w-full rounded-2xl p-5 text-left transition active:scale-[0.98] relative overflow-hidden border border-yellow-500/30 hover:border-yellow-400/50 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.10) 0%, rgba(249,115,22,0.06) 100%)' }}>
              <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">EXPRESS</div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-bold text-base">Passer devant</p>
                    <p className="text-gray-400 text-sm mt-0.5">Joué juste après le titre en cours</p>
                  </div>
                </div>
                <p className="font-black text-2xl text-yellow-300 flex-shrink-0">{formatPrice(pricePriority)}</p>
              </div>
            </button>
          </div>
          {submitting && <p className="text-center text-gray-500 text-sm flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> …</p>}
          {isPaid && <p className="text-center text-gray-600 text-xs">Paiement sécurisé par Stripe · débité seulement si confirmé</p>}
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
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/25 flex items-center justify-center">
              <Disc3 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-sm leading-none">{session.profiles?.dj_name ?? 'Hôte'}</p>
              <p className="text-gray-500 text-xs mt-0.5 leading-none">{session.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 rounded-xl px-2.5 py-1.5 border border-emerald-500/20">
            <ListMusic className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-300 text-xs font-semibold">Jukebox</span>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 sm:px-8 pt-5 sm:pt-8 pb-8 max-w-2xl mx-auto w-full space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Mets ta chanson 🎶</h1>
          <p className="text-gray-400 text-sm sm:text-base mt-0.5">
            Ajoute un titre à la file — il passera sur les enceintes du lieu.
            {isPaid && <span className="text-emerald-400"> {priceNormal > 0 ? `À partir de ${formatPrice(priceNormal)}.` : ''}</span>}
          </p>
        </div>

        <input
          type="text" value={authorName} onChange={e => setAuthorName(e.target.value)}
          placeholder="Ton prénom (optionnel)" maxLength={40}
          className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition text-sm"
        />

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
          <input
            ref={inputRef}
            type="search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Titre, artiste…" autoFocus
            className="w-full pl-12 pr-10 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:bg-white/8 transition text-base"
          />
          {searchLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-500" />}
          {!searchLoading && query && (
            <button onClick={() => { setQuery(''); setTracks([]) }} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm px-4 py-2.5">{error}</div>
        )}

        {tracks.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {tracks.map(track => (
              <button key={track.id} onClick={() => chooseTrack(track)} disabled={submitting}
                className="w-full glass rounded-2xl p-3 flex gap-3 items-center hover:bg-white/8 active:scale-[0.98] transition text-left group disabled:opacity-50">
                {track.image && <img src={track.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate text-sm">{track.name}</p>
                  <p className="text-gray-400 text-xs truncate">{track.artist}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0 group-hover:text-emerald-400 transition" />
              </button>
            ))}
          </div>
        )}

        {!query && added.length === 0 && (
          <div className="text-center py-16 space-y-2 opacity-40">
            <Music2 className="w-10 h-10 mx-auto text-emerald-600" />
            <p className="text-gray-500 text-sm">Recherche un morceau pour l&apos;ajouter</p>
          </div>
        )}

        {added.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs uppercase tracking-widest font-bold text-gray-500 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Tes morceaux ajoutés
            </p>
            {added.map((a, i) => (
              <div key={`${a.id}-${i}`} className="glass rounded-xl p-2.5 flex gap-3 items-center">
                {a.image && <img src={a.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate text-sm flex items-center gap-1.5">
                    {a.express && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">⚡</span>}
                    <span className="truncate">{a.name}</span>
                  </p>
                  <p className="text-gray-500 text-xs truncate">{a.artist}</p>
                </div>
                <span className="text-emerald-400 text-xs font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> En file
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
