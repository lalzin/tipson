'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Session, Message } from '@/types'
import { displayColors } from '@/lib/displayThemes'
import { Maximize2, Minimize2 } from 'lucide-react'
import { LogoBadge } from '@/components/Logo'

type Floating = { id: number; emoji: string; left: number }

export default function DisplayPage() {
  const { id } = useParams<{ id: string }>()
  const [session, setSession] = useState<Session & { profiles?: { dj_name: string } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [floats, setFloats] = useState<Floating[]>([])
  const [votePops, setVotePops] = useState<{ id: number; left: number }[]>([])
  const [superMsg, setSuperMsg] = useState<Message | null>(null)
  const [validFlash, setValidFlash] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const counter = useRef(0)

  // Plein écran (comme une vidéo)
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // En plein écran : contrôles discrets, masqués puis révélés au mouvement de la souris
  useEffect(() => {
    if (!isFullscreen) { setControlsVisible(true); return }
    let timer: ReturnType<typeof setTimeout>
    const reveal = () => {
      setControlsVisible(true)
      clearTimeout(timer)
      timer = setTimeout(() => setControlsVisible(false), 2500)
    }
    reveal() // visible brièvement à l'entrée en plein écran
    window.addEventListener('mousemove', reveal)
    window.addEventListener('touchstart', reveal)
    return () => { clearTimeout(timer); window.removeEventListener('mousemove', reveal); window.removeEventListener('touchstart', reveal) }
  }, [isFullscreen])
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const spawnEmoji = useCallback((glyph?: string) => {
    const emoji = glyph || '❤️'
    const fid = counter.current++
    setFloats(f => [...f, { id: fid, emoji, left: 5 + Math.random() * 90 }])
    setTimeout(() => setFloats(f => f.filter(x => x.id !== fid)), 2500)
  }, [])

  // « +1 » de vote (mur de votes) : animation dédiée
  const spawnVote = useCallback(() => {
    const fid = counter.current++
    setVotePops(v => [...v, { id: fid, left: 8 + Math.random() * 84 }])
    setTimeout(() => setVotePops(v => v.filter(x => x.id !== fid)), 1700)
  }, [])

  // Chargement de la session (les messages restent éphémères : pas d'historique)
  useEffect(() => {
    fetch(`/api/sessions/public/${id}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(setSession).finally(() => setLoading(false))
  }, [id])

  // Ajoute un message temporaire (disparaît au bout de 40s)
  const pushMessage = useCallback((m: Message) => {
    setMessages(prev => [...prev, m])
    setTimeout(() => setMessages(prev => prev.filter(x => x.id !== m.id)), 40000)
  }, [])

  // Realtime : emojis (broadcast), messages (insert), validation de son (update)
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`display-${id}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'emoji' }, ({ payload }) => spawnEmoji(payload?.glyph || payload?.type))
      .on('broadcast', { event: 'vote' }, () => spawnVote())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_id=eq.${id}` },
        ({ new: m }: any) => {
          pushMessage(m as Message)
          if (m.is_super) { setSuperMsg(m as Message); setTimeout(() => setSuperMsg(null), 4500) }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `session_id=eq.${id}` },
        ({ new: r }: any) => {
          if (r.status === 'approved') {
            setValidFlash(`${r.song_name} · ${r.artist}`)
            setTimeout(() => setValidFlash(null), 2200)
          }
        })
      // Met à jour la config en direct (animation de fond, activation…)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${id}` },
        ({ new: s }: any) => setSession(prev => prev ? { ...prev, ...s } : prev))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, spawnEmoji, spawnVote, pushMessage])

  if (loading) return <div className="min-h-screen bg-gray-950" />
  if (!session) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">Soirée introuvable</div>
  if (!session.display_enabled) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-4xl">📺</p>
        <h1 className="text-2xl font-bold">Mode visualisation désactivé</h1>
        <p className="text-gray-500 text-sm">Activez-le depuis la console DJ.</p>
      </div>
    )
  }

  const bg = session.display_bg || 'waves'
  const { c1, c2 } = displayColors(session)
  const joinUrl = `${origin}/join?code=${session.code}`
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&bgcolor=0a0a0a&color=ffffff&qzone=1&data=${encodeURIComponent(joinUrl)}`
  const tickerMsgs = messages.length ? messages : [{ id: 'x', text: 'Envoyez vos messages et vos ❤️ depuis votre téléphone', author_name: null } as any]

  const cssVars = { ['--c1' as any]: c1, ['--c2' as any]: c2 } as React.CSSProperties
  const cssBg = bg === 'waves' ? 'bg-waves' : bg === 'neon' ? 'bg-neon' : bg === 'mesh' ? 'bg-mesh'
    : bg === 'aurora' ? 'bg-aurora-base' : 'bg-gray-950'

  return (
    <main style={cssVars} className={`relative h-screen w-screen overflow-hidden text-white ${cssBg} ${isFullscreen && !controlsVisible ? 'cursor-none' : ''}`}>
      {/* Fonds alternatifs */}
      {bg === 'pulse' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="bg-pulse-orb" style={{ width: 520, height: 520, top: '8%', left: '12%', background: c1 }} />
          <div className="bg-pulse-orb" style={{ width: 480, height: 480, bottom: '6%', right: '10%', background: c2, animationDelay: '1.1s' }} />
          <div className="bg-pulse-orb" style={{ width: 360, height: 360, top: '40%', left: '55%', background: c1, animationDelay: '0.6s' }} />
        </div>
      )}
      {bg === 'particles' && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="bg-particle" style={{
              width: 8 + (i % 5) * 5, height: 8 + (i % 5) * 5,
              top: `${(i * 37) % 100}%`, left: `${(i * 53) % 100}%`,
              background: i % 2 ? c1 : c2, opacity: 0.5, filter: 'blur(1px)',
              animationDelay: `${i * 0.3}s`,
            }} />
          ))}
        </div>
      )}
      {bg === 'aurora' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="bg-aurora-veil" style={{ background: `linear-gradient(90deg, transparent, ${c1}, transparent)` }} />
          <div className="bg-aurora-veil" style={{ background: `linear-gradient(90deg, transparent, ${c2}, transparent)`, animationDelay: '1.3s' }} />
          <div className="bg-aurora-veil" style={{ background: `linear-gradient(90deg, transparent, ${c1}, transparent)`, animationDelay: '2.1s' }} />
        </div>
      )}
      {bg === 'rays' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="bg-rays-spin" />
        </div>
      )}
      {bg === 'bokeh' && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="bg-bokeh-orb" style={{
              width: 30 + (i % 6) * 18, height: 30 + (i % 6) * 18,
              top: `${(i * 41) % 95}%`, left: `${(i * 67) % 95}%`,
              background: i % 2 ? c1 : c2,
              animationDuration: `${2.5 + (i % 4)}s`, animationDelay: `${i * 0.25}s`,
            }} />
          ))}
        </div>
      )}
      {bg === 'equalizer' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 44 }).map((_, i) => (
            <div key={i} className="bg-eq-bar" style={{
              left: `${(i / 44) * 100}%`, width: `${100 / 44 - 0.4}%`,
              height: `${30 + (i % 7) * 8}vh`,
              background: `linear-gradient(to top, ${c1}, ${c2})`, opacity: 0.55,
              animationDuration: `${0.6 + (i % 5) * 0.18}s`, animationDelay: `${(i % 9) * 0.08}s`,
            }} />
          ))}
        </div>
      )}
      {bg === 'confetti' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} className="bg-confetti" style={{
              left: `${(i * 53) % 100}%`,
              background: i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : '#ffffff',
              animationDuration: `${3 + (i % 5) * 0.7}s`, animationDelay: `${(i % 10) * 0.4}s`,
            }} />
          ))}
        </div>
      )}
      <div className="absolute inset-0 bg-black/25 pointer-events-none" />

      {/* Badge beta + plein écran — discrets, masqués en plein écran sans mouvement */}
      <div className={`absolute top-4 right-4 z-30 flex items-center gap-2 transition-opacity duration-500 ${
        isFullscreen && !controlsVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <button onClick={toggleFullscreen}
          title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          className="group flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white transition backdrop-blur">
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isFullscreen ? 'Quitter' : 'Plein écran'}</span>
        </button>
        <div className="text-xs px-2.5 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-200">
          Beta · en développement
        </div>
      </div>

      {/* En-tête : logo + nom */}
      <div className="absolute top-6 left-8 z-20 flex items-center gap-3">
        <LogoBadge className="w-12 h-12 shadow-xl" gradient={[c1, c2]} />
        <div>
          <p className="font-black text-2xl tracking-tight leading-none">TIPSON</p>
          <p className="text-white/60 text-sm mt-1">{session.profiles?.dj_name ?? session.name}</p>
        </div>
      </div>

      {/* QR + code (côté droit) */}
      <div className="absolute top-1/2 right-10 -translate-y-1/2 z-20 flex flex-col items-center gap-4">
        <div className="bg-gray-950/80 rounded-3xl p-4 border border-white/10 shadow-2xl">
          <img src={qrSrc} alt="QR" width={260} height={260} className="rounded-xl" />
        </div>
        <div className="text-center">
          <p className="text-white/50 text-sm uppercase tracking-widest">Code soirée</p>
          <p className="font-black text-5xl tracking-[0.3em] font-mono">{session.code}</p>
        </div>
        <p className="text-white/50 text-sm">Scannez pour participer</p>
      </div>

      {/* Zone centrale (DJ + titre animés + flash de validation) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none pr-72 text-center">
        {session.display_show_dj !== false && session.profiles?.dj_name && (
          <p className="dj-anim text-4xl lg:text-6xl font-black uppercase mb-4" style={{ color: c1 }}>
            🎧 {session.profiles.dj_name}
          </p>
        )}
        {session.display_show_name !== false && (
          <h1 className="center-anim text-5xl lg:text-7xl font-black drop-shadow-2xl"
            style={{ backgroundImage: `linear-gradient(90deg, ${c1}, ${c2}, ${c1})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            {session.name}
          </h1>
        )}
        {session.display_show_venue !== false && session.venue && (
          <p className="text-2xl lg:text-3xl text-white/60 font-medium mt-3">📍 {session.venue}</p>
        )}
        {validFlash && (
          <div className="valid-flash mt-10 px-8 py-5 rounded-3xl bg-white/10 backdrop-blur border border-white/20">
            <p className="text-pink-300 text-sm font-bold uppercase tracking-widest">🎶 Nouveau son validé</p>
            <p className="text-3xl font-bold mt-1">{validFlash}</p>
          </div>
        )}
      </div>

      {/* Emojis flottants */}
      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
        {votePops.map(v => (
          <span key={v.id} className="vote-pop" style={{ left: `${v.left}%`, color: c1 }}>+1 🔥</span>
        ))}
        {floats.map(f => (
          <span key={f.id} className="float-emoji-big text-6xl" style={{ left: `${f.left}%` }}>{f.emoji}</span>
        ))}
      </div>

      {/* Super-message */}
      {superMsg && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none px-10">
          <div className="super-pop max-w-4xl text-center px-12 py-10 rounded-[2.5rem] border-2 border-white/30 shadow-2xl"
            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
            <p className="text-white/80 text-lg font-bold uppercase tracking-widest mb-3">✨ Super message ✨</p>
            <p className="text-5xl font-black leading-tight break-words">{superMsg.text}</p>
            {superMsg.author_name && <p className="text-white/80 text-2xl mt-5">· {superMsg.author_name}</p>}
          </div>
        </div>
      )}

      {/* Bandeau de messages défilant */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-black/40 backdrop-blur border-t border-white/10 py-4 overflow-hidden">
        <div className="ticker-track" style={{ animationDuration: `${Math.max(20, tickerMsgs.length * 6)}s` }}>
          {[...tickerMsgs, ...tickerMsgs].map((m, i) => (
            <span key={i} className="mx-8 text-2xl">
              {m.author_name && <span className="text-purple-300 font-bold">{m.author_name} : </span>}
              <span className="text-white/90">{m.text}</span>
            </span>
          ))}
        </div>
      </div>
    </main>
  )
}
