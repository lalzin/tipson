'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Send, Sparkles, Loader2, X } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import dynamic from 'next/dynamic'

const SuperMessageForm = dynamic(() => import('@/components/customer/SuperMessageForm'), { ssr: false })

const EMOJIS = [
  { type: 'heart', glyph: '❤️' },
  { type: 'like', glyph: '👍' },
  { type: 'fire', glyph: '🔥' },
  { type: 'star', glyph: '⭐' },
  { type: 'clap', glyph: '👏' },
]

interface Props {
  sessionId: string
  displayEnabled: boolean
  messagesEnabled: boolean
  superEnabled: boolean
  superPrice: number
}

export default function InteractionBar({ sessionId, displayEnabled, messagesEnabled, superEnabled, superPrice }: Props) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const lastEmoji = useRef(0)
  const [text, setText] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [showSuper, setShowSuper] = useState(false)

  // Pseudo choisi par l'utilisateur (jamais le vrai nom auto). Mémorisé en local.
  useEffect(() => {
    const saved = localStorage.getItem('tipson-pseudo')
    if (saved) setPseudo(saved)
  }, [])
  function updatePseudo(v: string) {
    const clean = v.slice(0, 24)
    setPseudo(clean)
    localStorage.setItem('tipson-pseudo', clean)
  }
  const authorName = pseudo.trim()

  // Canal broadcast pour les emojis (éphémère, aucune écriture en base)
  useEffect(() => {
    if (!displayEnabled) return
    const supabase = createClient()
    const ch = supabase.channel(`display-${sessionId}`)
    ch.subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch); channelRef.current = null }
  }, [sessionId, displayEnabled])

  function sendEmoji(type: string) {
    const now = Date.now()
    if (now - lastEmoji.current < 400) return // anti-spam : 1 / 400ms
    lastEmoji.current = now
    channelRef.current?.send({ type: 'broadcast', event: 'emoji', payload: { type } })
  }

  async function sendMessage() {
    const t = text.trim()
    if (!t) return
    setSending(true); setFeedback('')
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t, author_name: authorName || null }),
      })
      const d = await res.json()
      if (!res.ok) { setFeedback(d.error || 'Message refusé'); }
      else { setText(''); setFeedback('Message envoyé ✓') }
    } catch { setFeedback('Erreur réseau') }
    finally { setSending(false); setTimeout(() => setFeedback(''), 2500) }
  }

  if (!displayEnabled && !messagesEnabled) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-gray-950/95 backdrop-blur px-5 py-3 space-y-2.5 shadow-2xl shadow-black/50 max-w-2xl mx-auto">
      {/* Emojis */}
      {displayEnabled && (
        <div className="flex items-center justify-center gap-2">
          {EMOJIS.map(e => (
            <button key={e.type} onClick={() => sendEmoji(e.type)}
              className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/12 active:scale-90 text-2xl transition flex items-center justify-center">
              {e.glyph}
            </button>
          ))}
        </div>
      )}

      {/* Message + pseudo */}
      {messagesEnabled && (
        <div className="space-y-2">
          <input
            value={pseudo} onChange={e => updatePseudo(e.target.value)} maxLength={24}
            placeholder="Votre nom affiché (optionnel)"
            className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition text-xs"
          />
          <div className="flex items-center gap-2">
            <input
              value={text} onChange={e => setText(e.target.value)} maxLength={140}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
              placeholder="Un message pour l'écran…"
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition text-sm"
            />
            <button onClick={sendMessage} disabled={sending || !text.trim()}
              className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 flex items-center justify-center transition flex-shrink-0">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {feedback && <p className="text-center text-xs text-gray-400">{feedback}</p>}

      {/* Super message */}
      {messagesEnabled && superEnabled && !showSuper && (
        <button onClick={() => { if (text.trim()) setShowSuper(true); else setFeedback('Écrivez d\'abord votre message') }}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-purple-200 text-sm font-medium hover:from-purple-600/30 hover:to-pink-600/30 transition">
          <Sparkles className="w-4 h-4" /> Super message en grand sur l'écran · {formatPrice(superPrice)}
        </button>
      )}

      {showSuper && (
        <div className="rounded-2xl bg-white/5 border border-purple-500/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-purple-400" /> Super message</p>
            <button onClick={() => setShowSuper(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-gray-400 text-xs">« {text.trim()} » apparaîtra en grand, animé, sur l'écran de la soirée.</p>
          <SuperMessageForm
            sessionId={sessionId} text={text.trim()} authorName={authorName}
            onSuccess={() => { setShowSuper(false); setText(''); setFeedback('Super message envoyé ✨') }}
            onCancel={() => setShowSuper(false)}
          />
        </div>
      )}

      <p className="text-center text-[11px] text-gray-700">Interactions · beta</p>
    </div>
  )
}
