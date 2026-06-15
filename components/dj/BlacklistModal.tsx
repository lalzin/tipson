'use client'
import { useEffect, useState, useCallback } from 'react'
import { Search, Loader2, X, Plus, Trash2 } from 'lucide-react'
import type { SearchTrack, BlacklistTrack } from '@/types'

interface Props {
  sessionId: string
  price: number
  onPriceChange: (cents: number) => void
  onClose: () => void
}

export default function BlacklistModal({ sessionId, price, onPriceChange, onClose }: Props) {
  const [list, setList] = useState<BlacklistTrack[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchTrack[]>([])
  const [searching, setSearching] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const loadList = useCallback(() => {
    fetch(`/api/sessions/${sessionId}/blacklist`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.tracks) setList(d.tracks) })
  }, [sessionId])

  useEffect(() => { loadList() }, [loadList])

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const d = await res.json()
        setResults(d.tracks || [])
      } finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [query])

  const inList = (id: string) => list.some(t => String(t.itunes_id) === String(id))

  async function add(track: SearchTrack) {
    setBusy(track.id)
    await fetch(`/api/sessions/${sessionId}/blacklist`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itunes_id: track.id, name: track.name, artist: track.artist, image: track.image }),
    })
    loadList()
    setBusy(null)
  }

  async function remove(itunesId: string) {
    setBusy(itunesId)
    await fetch(`/api/sessions/${sessionId}/blacklist?itunes_id=${encodeURIComponent(itunesId)}`, { method: 'DELETE' })
    setList(l => l.filter(t => String(t.itunes_id) !== String(itunesId)))
    setBusy(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-6 space-y-4 max-h-[92vh] overflow-y-auto my-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">🔥 Liste noire</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-gray-500 text-xs">Les morceaux ici ne peuvent être demandés qu&apos;au tarif premium.</p>

        {/* Prix premium */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-300">Tarif morceau interdit</span>
          <div className="relative w-24">
            <input
              type="number" min="0.5" step="0.5"
              defaultValue={(price || 1000) / 100}
              onBlur={e => {
                let cents = Math.round(parseFloat(e.target.value || '0') * 100)
                if (isNaN(cents) || cents < 50) cents = 50
                e.target.value = String(cents / 100)
                onPriceChange(cents)
              }}
              className="w-full pl-3 pr-6 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-red-500 transition"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
          </div>
        </div>

        {/* Recherche pour ajouter */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un morceau à interdire…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition text-sm"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-500" />}
        </div>

        {results.length > 0 && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {results.map(t => (
              <div key={t.id} className="flex items-center gap-2 rounded-xl bg-white/5 p-2">
                {t.image && <img src={t.image} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{t.name}</p>
                  <p className="text-gray-500 text-xs truncate">{t.artist}</p>
                </div>
                {inList(t.id) ? (
                  <span className="text-red-400 text-xs px-2">déjà listé</span>
                ) : (
                  <button onClick={() => add(t)} disabled={busy === t.id}
                    className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 text-red-300 hover:bg-red-600/30 flex items-center justify-center transition flex-shrink-0">
                    {busy === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Liste actuelle */}
        <div className="space-y-1.5 border-t border-white/5 pt-3">
          <p className="text-gray-500 text-xs">{list.length} morceau{list.length > 1 ? 'x' : ''} en liste noire</p>
          {list.map(t => (
            <div key={t.id} className="flex items-center gap-2 rounded-xl bg-white/5 p-2">
              {t.image && <img src={t.image} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{t.name}</p>
                <p className="text-gray-500 text-xs truncate">{t.artist}</p>
              </div>
              <button onClick={() => remove(t.itunes_id)} disabled={busy === t.itunes_id}
                className="w-8 h-8 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 flex items-center justify-center transition flex-shrink-0">
                {busy === t.itunes_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
