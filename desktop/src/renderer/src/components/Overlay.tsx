import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { API_BASE } from '../lib/config'
import type { StudioSession } from '../lib/session'
import type { OverlayToggles } from './Settings'

interface Floating { id: number; glyph: string; left: number }
interface Msg { id: string; text: string; author_name: string | null; is_super: boolean }
interface Pos { x: number; y: number }

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
  const [superMsg, setSuperMsg] = useState<Msg | null>(null)
  const [validFlash, setValidFlash] = useState<string | null>(null)
  const counter = useRef(0)
  const superTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
          const msg = m as Msg
          // Les messages normaux défilent en bas ; les super messages passent en grand au centre.
          if (msg.is_super) {
            setSuperMsg(msg)
            onBeat?.()
            if (superTimer.current) clearTimeout(superTimer.current)
            superTimer.current = setTimeout(() => setSuperMsg(null), 9000)
          } else {
            setMessages(prev => [...prev.slice(-14), msg])
            setTimeout(() => setMessages(prev => prev.filter(x => x.id !== msg.id)), 45000)
          }
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
    return () => { supabase.removeChannel(ch); if (superTimer.current) clearTimeout(superTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  const c1 = session.display_color1 || '#a855f7'

  // ── Carte QR + code déplaçable (position mémorisée) ─────────────────────────
  const posKey = `tipson-qr-pos-${session.id}`
  const [pos, setPos] = useState<Pos>(() => {
    try { const raw = localStorage.getItem(posKey); if (raw) return JSON.parse(raw) } catch {}
    return { x: 24, y: Math.max(24, window.innerHeight - 300) }
  })
  const drag = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null)

  useEffect(() => { try { localStorage.setItem(posKey, JSON.stringify(pos)) } catch {} }, [pos, posKey])

  const onDrag = useCallback((e: MouseEvent) => {
    const d = drag.current; if (!d) return
    const x = Math.max(0, Math.min(window.innerWidth - 80, d.ox + e.clientX - d.sx))
    const y = Math.max(0, Math.min(window.innerHeight - 80, d.oy + e.clientY - d.sy))
    setPos({ x, y })
  }, [])
  const endDrag = useCallback(() => {
    drag.current = null
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('mouseup', endDrag)
  }, [onDrag])
  function startDrag(e: React.MouseEvent) {
    e.preventDefault()
    drag.current = { ox: pos.x, oy: pos.y, sx: e.clientX, sy: e.clientY }
    window.addEventListener('mousemove', onDrag)
    window.addEventListener('mouseup', endDrag)
  }

  const joinUrl = `${API_BASE}/join?code=${session.code}`
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&bgcolor=10-10-15&color=255-255-255&qzone=1&data=${encodeURIComponent(joinUrl)}`

  return (
    <div className="overlay">
      {/* En-tête */}
      <div style={{ position: 'absolute', top: 18, left: 22, textShadow: '0 2px 12px rgba(0,0,0,.7)' }}>
        <div style={{ fontWeight: 800, fontSize: 22 }}>{session.profiles?.dj_name ?? 'TIPSON'}</div>
        {toggles.track && session.display_show_name !== false && (
          <div style={{ color: '#cbd5e1', fontSize: 14 }}>{session.name}</div>
        )}
      </div>

      {/* Son validé */}
      {validFlash && (
        <div style={{ position: 'absolute', top: '12%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', textShadow: '0 2px 16px rgba(0,0,0,.8)' }}>
          <div style={{ color: c1, fontWeight: 800, fontSize: 13, letterSpacing: '.2em' }}>🎶 NOUVEAU SON VALIDÉ</div>
          <div style={{ fontWeight: 800, fontSize: 30, marginTop: 4 }}>{validFlash}</div>
        </div>
      )}

      {/* Super message — grand, au centre, animé */}
      {toggles.messages && superMsg && (
        <div key={superMsg.id} style={{
          position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%,-50%)',
          textAlign: 'center', maxWidth: '78vw', animation: 'superIn 9s cubic-bezier(.2,.8,.2,1) forwards',
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.3em', color: c1, marginBottom: 10 }}>⭐ SUPER MESSAGE</div>
          <div style={{
            fontSize: 'clamp(36px, 6vw, 84px)', fontWeight: 900, lineHeight: 1.05,
            color: '#fff', textShadow: `0 0 28px ${c1}, 0 4px 24px rgba(0,0,0,.85)`,
          }}>{superMsg.text}</div>
          {superMsg.author_name && (
            <div style={{ marginTop: 14, fontSize: 22, fontWeight: 700, color: c1, textShadow: '0 2px 12px rgba(0,0,0,.8)' }}>— {superMsg.author_name}</div>
          )}
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

      {/* Bandeau de messages défilant (ticker) */}
      {toggles.messages && messages.length > 0 && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 56, overflow: 'hidden', background: 'linear-gradient(to top, rgba(0,0,0,.7), transparent)', maskImage: 'linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)' }}>
          <div
            key={messages.length}
            style={{
              position: 'absolute', bottom: 14, whiteSpace: 'nowrap', display: 'inline-flex', gap: 0,
              animation: `ticker ${Math.max(18, messages.length * 7)}s linear infinite`,
            }}
          >
            {[...messages, ...messages].map((m, i) => (
              <span key={`${m.id}-${i}`} style={{ fontSize: 18, fontWeight: 500, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,.85)', paddingRight: 56 }}>
                {m.author_name && <span style={{ color: c1, fontWeight: 700 }}>{m.author_name} </span>}
                {m.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Carte QR + code soirée — déplaçable */}
      {toggles.code && (
        <div
          onMouseDown={startDrag}
          title="Glisser pour déplacer"
          style={{
            position: 'absolute', left: pos.x, top: pos.y, pointerEvents: 'auto', cursor: 'grab',
            background: 'rgba(8,8,14,.72)', backdropFilter: 'blur(10px)', border: `1px solid ${c1}55`,
            borderRadius: 18, padding: 14, textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,.55)',
            userSelect: 'none', width: 180,
          }}
        >
          <img src={qrSrc} alt="QR" width={150} height={150} draggable={false} style={{ borderRadius: 10, display: 'block', margin: '0 auto', background: '#0a0a0f' }} />
          <div style={{ fontSize: 10, letterSpacing: '.25em', color: '#9ca3af', marginTop: 10 }}>SCANNEZ · CODE</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 26, letterSpacing: '.18em', color: '#fff' }}>{session.code}</div>
        </div>
      )}

      <style>{`
        @keyframes floatUp { 0%{transform:translateY(0) scale(.6);opacity:0} 12%{opacity:1} 100%{transform:translateY(-82vh) scale(1.2);opacity:0} }
        @keyframes votePop { 0%{transform:translateY(0) scale(.6);opacity:0} 15%{transform:translateY(-8vh) scale(1.25);opacity:1} 100%{transform:translateY(-40vh) scale(1);opacity:0} }
        @keyframes ticker { from{transform:translateX(100vw)} to{transform:translateX(-50%)} }
        @keyframes superIn {
          0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}
          8%{opacity:1;transform:translate(-50%,-50%) scale(1.06)}
          14%{transform:translate(-50%,-50%) scale(1)}
          88%{opacity:1;transform:translate(-50%,-50%) scale(1)}
          100%{opacity:0;transform:translate(-50%,-50%) scale(.96)}
        }
      `}</style>
    </div>
  )
}
