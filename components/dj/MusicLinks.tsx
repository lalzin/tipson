'use client'
import { useEffect, useState } from 'react'
import type { MusicLinks as Links } from '@/types'

// Petites pastilles cliquables Deezer / Apple Music / Spotify pour une demande.
// Les liens sont récupérés via Odesli (song.link) et mis en cache en base.
// Si rien n'est disponible (ou rate-limité), le composant n'affiche rien.
export default function MusicLinks({ requestId, cached }: { requestId: string; cached?: Links | null }) {
  const [links, setLinks] = useState<Links | null>(cached ?? null)
  const [loaded, setLoaded] = useState(!!cached)

  useEffect(() => {
    if (loaded) return
    let active = true
    fetch(`/api/requests/${requestId}/music-links`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (active) { setLinks(d?.links ?? null); setLoaded(true) } })
      .catch(() => { if (active) setLoaded(true) })
    return () => { active = false }
  }, [requestId, loaded])

  if (!links) return null
  const items: { label: string; href?: string; cls: string }[] = [
    { label: 'Spotify', href: links.spotify, cls: 'text-green-400 hover:bg-green-500/15 border-green-500/20' },
    { label: 'Deezer', href: links.deezer, cls: 'text-pink-300 hover:bg-pink-500/15 border-pink-500/20' },
    { label: 'Apple', href: links.appleMusic, cls: 'text-gray-200 hover:bg-white/10 border-white/15' },
  ].filter(i => i.href)

  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map(i => (
        <a
          key={i.label}
          href={i.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-white/5 text-[11px] font-semibold transition ${i.cls}`}
        >
          ▶ {i.label}
        </a>
      ))}
    </div>
  )
}
