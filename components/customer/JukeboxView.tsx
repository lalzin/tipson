'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Loader2, X, Music2, ListMusic, Check, ChevronRight, Disc3,
} from 'lucide-react'
import type { Session, SearchTrack } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  session: Session & { profiles: { dj_name: string } }
  sessionId: string
}

interface Added { id: string; name: string; artist: string; image: string | null }

export default function JukeboxView({ session, sessionId }: Props) {
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<SearchTrack[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [added, setAdded] = useState<Added[]>([])
  const [error, setError] = useState('')
  const [authorName, setAuthorName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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

  async function addTrack(track: SearchTrack) {
    setError(''); setAddingId(track.id)
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
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ajout impossible')
      if (authorName.trim()) localStorage.setItem('tipson-pseudo', authorName.trim())
      const entry: Added = { id: track.id, name: track.name, artist: track.artist, image: track.image }
      const next = [entry, ...added].slice(0, 20)
      setAdded(next)
      localStorage.setItem(`tipson-jukebox-${sessionId}`, JSON.stringify(next))
      setQuery(''); setTracks([])
      setTimeout(() => inputRef.current?.focus(), 80)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally { setAddingId(null) }
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
              <button key={track.id} onClick={() => addTrack(track)} disabled={addingId === track.id}
                className="w-full glass rounded-2xl p-3 flex gap-3 items-center hover:bg-white/8 active:scale-[0.98] transition text-left group disabled:opacity-50">
                {track.image && <img src={track.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate text-sm">{track.name}</p>
                  <p className="text-gray-400 text-xs truncate">{track.artist}</p>
                </div>
                {addingId === track.id
                  ? <Loader2 className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0 group-hover:text-emerald-400 transition" />}
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
                  <p className="font-medium truncate text-sm">{a.name}</p>
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
