import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { StudioSession } from '../lib/session'
import type { OverlayToggles } from './Settings'

interface Floating { id: number; glyph: string; left: number }
interface Msg { id: string; text: string; author_name: string | null; is_super: boolean }

// Couche d'éléments TIPSON par-dessus le visualiseur (fond transparent).
// S'abonne au temps réel Supabase comme l'écran web : emojis, votes, messages,
// son validé. Mêmes canaux que /display/[id].
export default function Overlay({ session, toggles, onBeat }: {
  session: StudioSession
  toggles: OverlayToggles
  onBeat?: () => void
}) {
  const [floats, setFloats] = useState<Floating[]>([])
  const [votes, setVotes] = useState<{ id: number; left: number }[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [validFlash, setValidFlash] = useState<string | null>(null)
  const counter = useRef(0)

  useEffect(() => {
    const id = session.id
    const ch = supabase
      .channel(`display-${id}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'emoji' }, ({ payload }) => {
        const fid = counter.current++
        setFloats(f => [...f, { id: fid, glyph: payload?.glyph || '❤️', left: 5 + Math.random() * 90 }])
        setTimeout(() => setFloats(f => f.filter(x => x.id !== fid)), 2500)
      })
      .on('broadcast', { event: 'vote' }, () => {
        const fid = counter.current++
        setVotes(v => [...v, { id: fid, left: 8 + Math.random() * 84 }])
        setTimeout(() => setVotes(v => v.filter(x => x.id !== fid)), 1700)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_id=eq.${id}` },
        ({ new: m }: any) => {
          setMessages(prev => [...prev, m as Msg])
          setTimeout(() => setMessages(prev => prev.filter(x => x.id !== m.id)), 40000)
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `session_id=eq.${id}` },
        ({ new: r }: any) => {
          if (r.status === 'approved') {
            setValidFlash(`${r.song_name} · ${r.artist}`)
            onBeat?.()
            setTimeout(() => setValidFlash(null), 2600)
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  const c1 = session.display_color1 || '#a855f7'

  return (
    <div className="overlay">
      {/* En-tête */}
      <div style={{ position: 'absolute', top: 18, left: 22, textShadow: '0 2px 12px rgba(0,0,0,.7)' }}>
        <div style={{ fontWeight: 800, fontSize: 22 }}>{session.profiles?.dj_name ?? 'TIPSON'}</div>
        {toggles.track && session.display_show_name !== false && (
          <div style={{ color: '#cbd5e1', fontSize: 14 }}>{session.name}</div>
        )}
      </div>

      {/* Code soirée */}
      {toggles.code && (
        <div style={{ position: 'absolute', top: 18, right: 22, textAlign: 'right', textShadow: '0 2px 12px rgba(0,0,0,.7)' }}>
          <div style={{ fontSize: 11, letterSpacing: '.2em', color: '#9ca3af' }}>CODE</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 28, letterSpacing: '.2em' }}>{session.code}</div>
        </div>
      )}

      {/* Son validé */}
      {validFlash && (
        <div style={{ position: 'absolute', top: '14%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', textShadow: '0 2px 16px rgba(0,0,0,.8)' }}>
          <div style={{ color: c1, fontWeight: 800, fontSize: 13, letterSpacing: '.2em' }}>🎶 NOUVEAU SON VALIDÉ</div>
          <div style={{ fontWeight: 800, fontSize: 30, marginTop: 4 }}>{validFlash}</div>
        </div>
      )}

      {/* Emojis flottants */}
      {toggles.emojis && floats.map(f => (
        <span key={f.id} style={{ position: 'absolute', bottom: '8vh', left: `${f.left}%`, fontSize: 56, animation: 'floatUp 2.4s ease-out forwards' }}>{f.glyph}</span>
      ))}
      {/* +1 votes */}
      {toggles.votes && votes.map(v => (
        <span key={v.id} style={{ position: 'absolute', bottom: '12vh', left: `${v.left}%`, color: c1, fontWeight: 900, fontSize: 40, textShadow: '0 0 20px rgba(0,0,0,.6)', animation: 'votePop 1.6s ease-out forwards' }}>+1 🔥</span>
      ))}

      {/* Barre de messages */}
      {toggles.messages && messages.length > 0 && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 22px', background: 'linear-gradient(to top, rgba(0,0,0,.65), transparent)' }}>
          {messages.slice(-3).map(m => (
            <div key={m.id} style={{ fontSize: m.is_super ? 22 : 16, fontWeight: m.is_super ? 800 : 500, color: m.is_super ? c1 : '#fff', textShadow: '0 2px 10px rgba(0,0,0,.8)' }}>
              {m.author_name && <span style={{ color: '#9ca3af' }}>{m.author_name} · </span>}{m.text}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes floatUp { 0%{transform:translateY(0) scale(.6);opacity:0} 12%{opacity:1} 100%{transform:translateY(-82vh) scale(1.2);opacity:0} }
        @keyframes votePop { 0%{transform:translateY(0) scale(.6);opacity:0} 15%{transform:translateY(-8vh) scale(1.25);opacity:1} 100%{transform:translateY(-40vh) scale(1);opacity:0} }
      `}</style>
    </div>
  )
}
