'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Request } from '@/types'
import {
  Disc3, Loader2, CheckCircle2, AlertTriangle, ListMusic, Wifi, WifiOff, RefreshCw,
} from 'lucide-react'

// Le backend ne touche JAMAIS Apple Music. Ce composant tourne dans le navigateur
// de l'établissement : il charge MusicKit JS, s'authentifie au compte Apple Music du
// lieu, écoute la file interne (Supabase, via le prop `requests` déjà en Realtime)
// et fait le pont en appelant music.playNext({ song: trackId }) pour chaque nouveau
// morceau. Une fois envoyé, la demande passe en 'approved'.

declare global {
  interface Window { MusicKit: any }
}

const MUSICKIT_SRC = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js'
const DEV_TOKEN = process.env.NEXT_PUBLIC_APPLE_MUSIC_TOKEN || ''

interface Props {
  sessionId: string
  requests: Request[]
}

type Phase = 'loading' | 'no-token' | 'ready' | 'authorized' | 'error'

export default function JukeboxBridge({ sessionId, requests }: Props) {
  const [phase, setPhase] = useState<Phase>(DEV_TOKEN ? 'loading' : 'no-token')
  const [bridgeError, setBridgeError] = useState('')
  const [autoplay, setAutoplay] = useState(true)
  const musicRef = useRef<any>(null)
  const processingRef = useRef(false)
  const processedRef = useRef<Set<string>>(new Set())
  const supabase = useRef(createClient()).current

  // ── Charge & configure MusicKit JS ──────────────────────────────────
  useEffect(() => {
    if (!DEV_TOKEN) return
    let cancelled = false

    async function configure() {
      try {
        await window.MusicKit.configure({
          developerToken: DEV_TOKEN,
          app: { name: 'TIPSON Jukebox', build: '1.0.0' },
        })
        if (cancelled) return
        musicRef.current = window.MusicKit.getInstance()
        setPhase(musicRef.current?.isAuthorized ? 'authorized' : 'ready')
      } catch (e) {
        if (!cancelled) { setPhase('error'); setBridgeError('Configuration MusicKit impossible.') }
      }
    }

    if (window.MusicKit) {
      configure()
    } else {
      const existing = document.querySelector(`script[src="${MUSICKIT_SRC}"]`)
      const onLoaded = () => configure()
      document.addEventListener('musickitloaded', onLoaded)
      if (!existing) {
        const s = document.createElement('script')
        s.src = MUSICKIT_SRC
        s.async = true
        s.setAttribute('data-web-components', '')
        document.head.appendChild(s)
      }
      return () => { cancelled = true; document.removeEventListener('musickitloaded', onLoaded) }
    }
    return () => { cancelled = true }
  }, [])

  async function connect() {
    if (!musicRef.current) return
    try {
      await musicRef.current.authorize()
      setPhase('authorized')
      setBridgeError('')
    } catch {
      setBridgeError('Connexion Apple Music annulée ou refusée.')
    }
  }

  async function disconnect() {
    if (!musicRef.current) return
    try { await musicRef.current.unauthorize() } catch {}
    setPhase('ready')
  }

  // ── Pont : pousse les morceaux 'paid' vers la file Apple Music ───────
  const pushQueue = useCallback(async () => {
    if (phase !== 'authorized' || !autoplay || processingRef.current) return
    const music = musicRef.current
    if (!music) return

    const pending = requests
      .filter(r => r.request_type === 'jukebox' && r.status === 'paid' && r.spotify_uri && !processedRef.current.has(r.id))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    if (pending.length === 0) return

    processingRef.current = true
    try {
      for (const r of pending) {
        processedRef.current.add(r.id)
        try {
          await music.playNext({ song: String(r.spotify_uri) })
          // si rien ne joue encore, lance la lecture
          if (!music.isPlaying) { try { await music.play() } catch {} }
          await supabase.from('requests').update({ status: 'approved' }).eq('id', r.id)
        } catch (err) {
          processedRef.current.delete(r.id) // on réessaiera
          setBridgeError('Impossible d\'ajouter à la file Apple Music. Vérifiez qu\'un appareil est actif.')
          break
        }
      }
    } finally {
      processingRef.current = false
    }
  }, [phase, autoplay, requests, supabase])

  useEffect(() => { pushQueue() }, [pushQueue])

  // ── Vues d'état ─────────────────────────────────────────────────────
  const jukeboxReqs = requests.filter(r => r.request_type === 'jukebox')
  const queued = jukeboxReqs.filter(r => r.status === 'approved')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const waiting = jukeboxReqs.filter(r => r.status === 'paid')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return (
    <div className="space-y-5">
      {/* Bandeau de connexion */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/25 flex items-center justify-center">
              <Disc3 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">Pont Apple Music</p>
              <p className="text-gray-500 text-xs">Cet écran doit rester ouvert pendant la soirée</p>
            </div>
          </div>
          {phase === 'authorized' ? (
            <span className="flex items-center gap-1.5 text-emerald-300 text-xs font-medium bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/20">
              <Wifi className="w-3.5 h-3.5" /> Connecté
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-gray-400 text-xs font-medium bg-white/5 px-2.5 py-1.5 rounded-xl">
              <WifiOff className="w-3.5 h-3.5" /> Hors-ligne
            </span>
          )}
        </div>

        {phase === 'no-token' && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs px-3 py-2.5 flex gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Intégration Apple Music non configurée. Ajoutez la clé développeur Apple Music (<code>NEXT_PUBLIC_APPLE_MUSIC_TOKEN</code>) pour activer le jukebox.</span>
          </div>
        )}
        {phase === 'loading' && (
          <p className="text-gray-500 text-xs flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement de MusicKit…</p>
        )}
        {phase === 'error' && (
          <p className="text-red-300 text-xs flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" /> {bridgeError}</p>
        )}
        {phase === 'ready' && (
          <button onClick={connect}
            className="w-full py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 font-semibold text-sm transition">
            Connecter Apple Music
          </button>
        )}
        {phase === 'authorized' && (
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={autoplay} onChange={e => setAutoplay(e.target.checked)} className="accent-emerald-500 w-4 h-4" />
              Ajout automatique à la file
            </label>
            <button onClick={disconnect} className="text-gray-500 hover:text-gray-300 text-xs transition">Déconnecter</button>
          </div>
        )}
        {phase === 'authorized' && bridgeError && (
          <p className="text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {bridgeError}
            <button onClick={() => { setBridgeError(''); pushQueue() }} className="underline inline-flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> réessayer
            </button>
          </p>
        )}
      </div>

      {/* En attente d'envoi */}
      <section className="space-y-2">
        <h3 className="text-sm uppercase tracking-widest font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
          En attente <span className="text-gray-500 font-normal">({waiting.length})</span>
        </h3>
        {waiting.length === 0 ? (
          <div className="glass rounded-2xl py-8 text-center text-gray-600 text-sm">Aucun morceau en attente</div>
        ) : (
          <div className="space-y-2">{waiting.map(r => <Row key={r.id} r={r} pending />)}</div>
        )}
      </section>

      {/* Envoyés à Apple Music */}
      <section className="space-y-2">
        <h3 className="text-sm uppercase tracking-widest font-bold flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-emerald-400" />
          Dans la file Apple Music <span className="text-gray-500 font-normal">({queued.length})</span>
        </h3>
        {queued.length === 0 ? (
          <div className="glass rounded-2xl py-8 text-center text-gray-600 text-sm">Rien envoyé pour l&apos;instant</div>
        ) : (
          <div className="space-y-2">{queued.map(r => <Row key={r.id} r={r} />)}</div>
        )}
      </section>
    </div>
  )
}

function Row({ r, pending }: { r: Request; pending?: boolean }) {
  return (
    <div className="glass rounded-xl p-2.5 flex gap-3 items-center">
      {r.album_image && <img src={r.album_image} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate text-sm">{r.song_name}</p>
        <p className="text-gray-500 text-xs truncate">{r.artist}{r.customer_name ? ` · ${r.customer_name}` : ''}</p>
      </div>
      {pending
        ? <Loader2 className="w-4 h-4 text-yellow-400/70 animate-spin flex-shrink-0" />
        : <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
    </div>
  )
}
