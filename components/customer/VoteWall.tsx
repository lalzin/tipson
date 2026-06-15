'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Flame, Loader2, X, Music2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WallTrack {
  id: string
  song_name: string
  artist: string
  album_image: string | null
  request_type: string
  votes: number
}

export default function VoteWall({ sessionId, clientId, onClose }: {
  sessionId: string
  clientId: string
  onClose: () => void
}) {
  const [tracks, setTracks] = useState<WallTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [voted, setVoted] = useState<Set<string>>(new Set())
  const [votingId, setVotingId] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    try { setVoted(new Set(JSON.parse(localStorage.getItem(`tipson-votes-${sessionId}`) || '[]'))) } catch {}
    const supabase = createClient()
    const ch = supabase.channel(`display-${sessionId}`)
    ch.subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch); channelRef.current = null }
  }, [sessionId])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/wall`, { cache: 'no-store' })
      const d = await res.json()
      setTracks(d.tracks || [])
    } finally { setLoading(false) }
  }, [sessionId])

  useEffect(() => {
    load()
    const t = setInterval(() => { if (!document.hidden) load() }, 6000)
    return () => clearInterval(t)
  }, [load])

  async function vote(id: string) {
    if (voted.has(id) || votingId) return
    setVotingId(id)
    // optimiste
    setTracks(prev => prev.map(t => t.id === id ? { ...t, votes: t.votes + 1 } : t)
      .sort((a, b) => b.votes - a.votes))
    const nextVoted = new Set(voted); nextVoted.add(id); setVoted(nextVoted)
    localStorage.setItem(`tipson-votes-${sessionId}`, JSON.stringify(Array.from(nextVoted)))
    // émet le « +1 » sur l'écran de visualisation
    channelRef.current?.send({ type: 'broadcast', event: 'vote', payload: {} })
    try {
      const res = await fetch(`/api/requests/${id}/vote`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      })
      const d = await res.json()
      if (res.ok && typeof d.votes === 'number') {
        setTracks(prev => prev.map(t => t.id === id ? { ...t, votes: d.votes } : t).sort((a, b) => b.votes - a.votes))
      }
    } catch {} finally { setVotingId(null) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-6 space-y-4 max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><Flame className="w-5 h-5 text-orange-400" /> La foule décide</h2>
            <p className="text-gray-500 text-xs mt-0.5">Likez les sons que vous voulez entendre</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
        ) : tracks.length === 0 ? (
          <div className="py-16 text-center space-y-2 opacity-50">
            <Music2 className="w-9 h-9 mx-auto text-gray-600" />
            <p className="text-gray-500 text-sm">Aucune demande en attente pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto -mr-2 pr-2">
            {tracks.map((t, i) => {
              const has = voted.has(t.id)
              return (
                <div key={t.id} className="flex items-center gap-3 glass rounded-2xl p-2.5">
                  <span className="text-gray-600 font-bold text-sm w-5 text-center flex-shrink-0">{i + 1}</span>
                  {t.album_image
                    ? <img src={t.album_image} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                    : <div className="w-11 h-11 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"><Music2 className="w-4 h-4 text-gray-600" /></div>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.song_name}</p>
                    <p className="text-xs text-gray-500 truncate">{t.artist}</p>
                  </div>
                  <button onClick={() => vote(t.id)} disabled={has || votingId === t.id}
                    className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm transition flex-shrink-0',
                      has ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                          : 'bg-white/5 hover:bg-orange-500/15 hover:text-orange-300 border border-white/10')}>
                    {votingId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : has ? <Check className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
                    {t.votes}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
