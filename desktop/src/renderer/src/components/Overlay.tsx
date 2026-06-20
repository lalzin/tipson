import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { API_BASE } from '../lib/config'
import type { StudioSession } from '../lib/session'
import type { OverlayToggles } from './Settings'
import Movable from './Movable'

interface Floating { id: number; glyph: string; left: number }
interface Msg { id: string; text: string; author_name: string | null; is_super: boolean }
interface Req {
  id: string
  song_name: string
  artist: string
  album_image: string | null
  customer_name: string | null
  request_type: 'normal' | 'priority'
  status: string
}

// Couche d'éléments TIPSON par-dessus le visualiseur (fond transparent).
// Tous les blocs (en-tête, QR, demandes) sont librement déplaçables et
// activables/désactivables depuis les Réglages — le DJ compose son écran.
export default function Overlay({ session, toggles, onBeat }: {
  session: StudioSession
  toggles: OverlayToggles
  onBeat?: () => void
}) {
  const [floats, setFloats] = useState<Floating[]>([])
  const [votes, setVotes] = useState<{ id: number; left: number }[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [superMsg, setSuperMsg] = useState<Msg | null>(null)
  const [reqFeed, setReqFeed] = useState<Req[]>([])
  const [reqFlash, setReqFlash] = useState<{ req: Req; k: number } | null>(null)
  const [validFlash, setValidFlash] = useState<string | null>(null)
  const counter = useRef(0)
  const superTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seenReq = useRef<Set<string>>(new Set())

  const c1 = session.display_color1 || '#a855f7'
  const c2 = session.display_color2 || '#ec4899'

  const ingestRequest = useCallback((r: Req, fresh: boolean) => {
    if (r.status !== 'paid' && r.status !== 'approved') return
    setReqFeed(prev => [r, ...prev.filter(x => x.id !== r.id)].slice(0, 6))
    // Flash animé uniquement à la première apparition "validée" de la demande.
    if (fresh && !seenReq.current.has(r.id)) {
      seenReq.current.add(r.id)
      setReqFlash({ req: r, k: counter.current++ })
      onBeat?.()
      if (flashTimer.current) clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setReqFlash(null), r.request_type === 'priority' ? 7000 : 5000)
    }
  }, [onBeat])

  // Charge la file existante au démarrage (lecture publique des requests).
  useEffect(() => {
    let alive = true
    supabase.from('requests')
      .select('id,song_name,artist,album_image,customer_name,request_type,status')
      .eq('session_id', session.id)
      .in('status', ['paid', 'approved'])
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (!alive || !data) return
        data.forEach(d => seenReq.current.add(d.id))
        setReqFeed(data as Req[])
      })
    return () => { alive = false }
  }, [session.id])

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
      // Nouvelles demandes (insert déjà payé) et changements de statut.
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests', filter: `session_id=eq.${id}` },
        ({ new: r }: any) => ingestRequest(r as Req, true))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `session_id=eq.${id}` },
        ({ new: r }: any) => {
          ingestRequest(r as Req, true)
          if (r.status === 'approved') {
            setValidFlash(`${r.song_name} · ${r.artist}`)
            setTimeout(() => setValidFlash(null), 2600)
          }
          if (r.status === 'played' || r.status === 'rejected') {
            setReqFeed(prev => prev.filter(x => x.id !== r.id))
          }
        })
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
      if (superTimer.current) clearTimeout(superTimer.current)
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  const joinUrl = `${API_BASE}/join?code=${session.code}`
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&bgcolor=10-10-15&color=255-255-255&qzone=1&data=${encodeURIComponent(joinUrl)}`
  const hasHeader = toggles.dj || toggles.title || toggles.venue

  return (
    <div className="overlay">
      {/* ── En-tête déplaçable : DJ / titre / lieu ─────────────────────────── */}
      {hasHeader && (
        <Movable storageKey={`tipson-pos-${session.id}-header`} defaultPos={{ x: 24, y: 20 }}>
          <div style={{ textShadow: '0 2px 14px rgba(0,0,0,.75)', minWidth: 80 }}>
            {toggles.dj && session.profiles?.dj_name && (
              <div style={{ fontWeight: 900, fontSize: 30, letterSpacing: '-.01em', color: c1 }}>🎧 {session.profiles.dj_name}</div>
            )}
            {toggles.title && (
              <div style={{
                fontWeight: 900, fontSize: 24, marginTop: 2,
                backgroundImage: `linear-gradient(90deg, ${c1}, ${c2}, ${c1})`,
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              }}>{session.name}</div>
            )}
            {toggles.venue && session.venue && (
              <div style={{ color: '#cbd5e1', fontSize: 15, marginTop: 2 }}>📍 {session.venue}</div>
            )}
          </div>
        </Movable>
      )}

      {/* ── Demandes (file déplaçable) ─────────────────────────────────────── */}
      {toggles.requests && reqFeed.length > 0 && (
        <Movable storageKey={`tipson-pos-${session.id}-requests`} defaultPos={() => ({ x: Math.max(24, window.innerWidth - 320), y: 90 })}>
          <div style={{
            width: 290, background: 'rgba(8,8,14,.66)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 12, boxShadow: '0 12px 40px rgba(0,0,0,.5)',
          }}>
            <div style={{ fontSize: 11, letterSpacing: '.22em', color: '#9ca3af', marginBottom: 8, fontWeight: 700 }}>🎵 DEMANDES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {reqFeed.map(r => {
                const express = r.request_type === 'priority'
                return (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: 7, borderRadius: 11,
                    background: express ? `linear-gradient(90deg, ${c1}22, transparent)` : 'rgba(255,255,255,.04)',
                    border: express ? `1px solid ${c1}66` : '1px solid transparent',
                  }}>
                    {r.album_image
                      ? <img src={r.album_image} alt="" width={38} height={38} draggable={false} style={{ borderRadius: 7, flexShrink: 0, objectFit: 'cover' }} />
                      : <div style={{ width: 38, height: 38, borderRadius: 7, background: '#1f2937', flexShrink: 0, display: 'grid', placeItems: 'center' }}>🎵</div>}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.song_name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.artist}{r.customer_name ? ` · ${r.customer_name}` : ''}
                      </div>
                    </div>
                    {express && <span style={{ fontSize: 9, fontWeight: 800, color: c1, letterSpacing: '.1em', flexShrink: 0 }}>⚡EXPRESS</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </Movable>
      )}

      {/* ── QR + code soirée déplaçable ────────────────────────────────────── */}
      {toggles.code && (
        <Movable storageKey={`tipson-pos-${session.id}-qr`} defaultPos={() => ({ x: 24, y: Math.max(24, window.innerHeight - 300) })}>
          <div style={{
            background: 'rgba(8,8,14,.72)', backdropFilter: 'blur(10px)', border: `1px solid ${c1}55`,
            borderRadius: 18, padding: 14, textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,.55)', width: 180,
          }}>
            <img src={qrSrc} alt="QR" width={150} height={150} draggable={false} style={{ borderRadius: 10, display: 'block', margin: '0 auto', background: '#0a0a0f' }} />
            <div style={{ fontSize: 10, letterSpacing: '.25em', color: '#9ca3af', marginTop: 10 }}>SCANNEZ · CODE</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 26, letterSpacing: '.18em', color: '#fff' }}>{session.code}</div>
          </div>
        </Movable>
      )}

      {/* ── Flashs (non déplaçables, centrés) ──────────────────────────────── */}
      {/* Nouvelle demande / demande express */}
      {toggles.requests && reqFlash && (
        <div key={reqFlash.k} style={{
          position: 'absolute', top: '22%', left: '50%', transform: 'translateX(-50%)',
          textAlign: 'center', animation: 'reqIn 5s cubic-bezier(.2,.8,.2,1) forwards', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '.25em', color: c1, marginBottom: 6 }}>
            {reqFlash.req.request_type === 'priority' ? '⚡ DEMANDE EXPRESS' : '🎵 NOUVELLE DEMANDE'}
          </div>
          <div style={{ fontSize: 'clamp(28px,4.5vw,56px)', fontWeight: 900, color: '#fff', textShadow: `0 0 26px ${c1}, 0 4px 22px rgba(0,0,0,.85)` }}>
            {reqFlash.req.song_name}
          </div>
          <div style={{ fontSize: 20, color: '#cbd5e1', marginTop: 4 }}>
            {reqFlash.req.artist}{reqFlash.req.customer_name ? ` · ${reqFlash.req.customer_name}` : ''}
          </div>
        </div>
      )}

      {/* Son validé */}
      {validFlash && (
        <div style={{ position: 'absolute', top: '12%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', textShadow: '0 2px 16px rgba(0,0,0,.8)', pointerEvents: 'none' }}>
          <div style={{ color: c1, fontWeight: 800, fontSize: 13, letterSpacing: '.2em' }}>🎶 NOUVEAU SON VALIDÉ</div>
          <div style={{ fontWeight: 800, fontSize: 30, marginTop: 4 }}>{validFlash}</div>
        </div>
      )}

      {/* Super message — grand, au centre, animé */}
      {toggles.messages && superMsg && (
        <div key={superMsg.id} style={{
          position: 'absolute', top: '46%', left: '50%', transform: 'translate(-50%,-50%)',
          textAlign: 'center', maxWidth: '78vw', animation: 'superIn 9s cubic-bezier(.2,.8,.2,1) forwards', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.3em', color: c1, marginBottom: 10 }}>⭐ SUPER MESSAGE</div>
          <div style={{ fontSize: 'clamp(36px, 6vw, 84px)', fontWeight: 900, lineHeight: 1.05, color: '#fff', textShadow: `0 0 28px ${c1}, 0 4px 24px rgba(0,0,0,.85)` }}>{superMsg.text}</div>
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
          <div key={messages.length} style={{ position: 'absolute', bottom: 14, whiteSpace: 'nowrap', display: 'inline-flex', animation: `ticker ${Math.max(18, messages.length * 7)}s linear infinite` }}>
            {[...messages, ...messages].map((m, i) => (
              <span key={`${m.id}-${i}`} style={{ fontSize: 18, fontWeight: 500, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,.85)', paddingRight: 56 }}>
                {m.author_name && <span style={{ color: c1, fontWeight: 700 }}>{m.author_name} </span>}
                {m.text}
              </span>
            ))}
          </div>
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
        @keyframes reqIn {
          0%{opacity:0;transform:translateX(-50%) translateY(-16px) scale(.8)}
          10%{opacity:1;transform:translateX(-50%) translateY(0) scale(1.04)}
          16%{transform:translateX(-50%) scale(1)}
          85%{opacity:1}
          100%{opacity:0;transform:translateX(-50%) scale(.97)}
        }
      `}</style>
    </div>
  )
}
