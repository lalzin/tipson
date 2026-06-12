'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Session, Message } from '@/types'

type Floating = { id: number; emoji: string; left: number }

const EMOJI: Record<string, string> = { heart: '❤️', like: '👍', fire: '🔥', star: '⭐', clap: '👏' }

export default function DisplayPage() {
  const { id } = useParams<{ id: string }>()
  const [session, setSession] = useState<Session & { profiles?: { dj_name: string } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [floats, setFloats] = useState<Floating[]>([])
  const [superMsg, setSuperMsg] = useState<Message | null>(null)
  const [validFlash, setValidFlash] = useState<string | null>(null)
  const counter = useRef(0)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const spawnEmoji = useCallback((type: string) => {
    const emoji = EMOJI[type] ?? '❤️'
    const fid = counter.current++
    setFloats(f => [...f, { id: fid, emoji, left: 5 + Math.random() * 90 }])
    setTimeout(() => setFloats(f => f.filter(x => x.id !== fid)), 3700)
  }, [])

  // Chargement session + messages initiaux
  useEffect(() => {
    fetch(`/api/sessions/public/${id}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(setSession).finally(() => setLoading(false))
    fetch(`/api/sessions/${id}/messages`).then(r => r.ok ? r.json() : null).then(d => { if (d?.messages) setMessages(d.messages) })
  }, [id])

  // Realtime : emojis (broadcast), messages (insert), validation de son (update)
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`display-${id}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'emoji' }, ({ payload }) => spawnEmoji(payload?.type))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_id=eq.${id}` },
        ({ new: m }: any) => {
          setMessages(prev => [...prev.slice(-40), m as Message])
          if (m.is_super) { setSuperMsg(m as Message); setTimeout(() => setSuperMsg(null), 6000) }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `session_id=eq.${id}` },
        ({ new: r }: any) => {
          if (r.status === 'approved') {
            setValidFlash(`${r.song_name} — ${r.artist}`)
            setTimeout(() => setValidFlash(null), 3200)
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, spawnEmoji])

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
  const joinUrl = `${origin}/join?code=${session.code}`
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&bgcolor=0a0a0a&color=ffffff&qzone=1&data=${encodeURIComponent(joinUrl)}`
  const tickerMsgs = messages.length ? messages : [{ id: 'x', text: 'Envoyez vos messages et vos ❤️ depuis votre téléphone', author_name: null } as any]

  return (
    <main className={`relative h-screen w-screen overflow-hidden text-white ${bg === 'waves' ? 'bg-waves' : 'bg-gray-950'}`}>
      {/* Fonds alternatifs */}
      {bg === 'pulse' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="bg-pulse-orb" style={{ width: 500, height: 500, top: '10%', left: '15%', background: '#7c3aed' }} />
          <div className="bg-pulse-orb" style={{ width: 460, height: 460, bottom: '8%', right: '12%', background: '#db2777', animationDelay: '1.2s' }} />
        </div>
      )}
      {bg === 'particles' && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="bg-particle" style={{
              width: 8 + (i % 5) * 4, height: 8 + (i % 5) * 4,
              top: `${(i * 37) % 100}%`, left: `${(i * 53) % 100}%`,
              background: i % 2 ? 'rgba(168,85,247,0.5)' : 'rgba(236,72,153,0.45)',
              animationDelay: `${i * 0.3}s`,
            }} />
          ))}
        </div>
      )}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Badge beta */}
      <div className="absolute top-4 right-4 z-30 text-xs px-2.5 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-200">
        Beta · en développement
      </div>

      {/* En-tête : logo + nom */}
      <div className="absolute top-6 left-8 z-20 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-xl">
          <span className="font-black text-2xl">T</span>
        </div>
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

      {/* Zone centrale (titre + flash de validation) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none pr-72">
        <h1 className="text-6xl lg:text-7xl font-black text-center drop-shadow-2xl">{session.name}</h1>
        {validFlash && (
          <div className="valid-flash mt-10 px-8 py-5 rounded-3xl bg-white/10 backdrop-blur border border-white/20 text-center">
            <p className="text-pink-300 text-sm font-bold uppercase tracking-widest">🎶 Nouveau son validé</p>
            <p className="text-3xl font-bold mt-1">{validFlash}</p>
          </div>
        )}
      </div>

      {/* Emojis flottants */}
      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
        {floats.map(f => (
          <span key={f.id} className="float-emoji text-6xl" style={{ left: `${f.left}%` }}>{f.emoji}</span>
        ))}
      </div>

      {/* Super-message */}
      {superMsg && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none px-10">
          <div className="super-pop max-w-4xl text-center px-12 py-10 rounded-[2.5rem] bg-gradient-to-br from-purple-600/90 to-pink-600/90 border-2 border-white/30 shadow-2xl">
            <p className="text-white/80 text-lg font-bold uppercase tracking-widest mb-3">✨ Super message ✨</p>
            <p className="text-5xl font-black leading-tight break-words">{superMsg.text}</p>
            {superMsg.author_name && <p className="text-white/80 text-2xl mt-5">— {superMsg.author_name}</p>}
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
