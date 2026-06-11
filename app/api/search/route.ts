import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export interface SearchTrack {
  id: string
  name: string
  artist: string
  album: string
  image: string      // 600x600
  imageSm: string    // 100x100
  previewUrl: string | null
  durationMs: number
}

export async function GET(req: NextRequest) {
  // Protège l'API iTunes d'un flood : 60 recherches / minute / IP
  const limited = rateLimit(req, { bucket: 'search', limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const q = req.nextUrl.searchParams.get('q')
  if (!q || q.trim().length < 2 || q.length > 100) {
    return NextResponse.json({ tracks: [] })
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q.trim())}&entity=song&limit=12&country=FR&lang=fr_fr`
    const res = await fetch(url, { next: { revalidate: 60 } })

    if (!res.ok) throw new Error('iTunes API error')

    const data = await res.json()

    const tracks: SearchTrack[] = data.results.map((item: any) => ({
      id: String(item.trackId),
      name: item.trackName,
      artist: item.artistName,
      album: item.collectionName,
      // Apple renvoie du 100x100 — on remplace par 600x600
      image: item.artworkUrl100?.replace('100x100bb', '600x600bb') ?? '',
      imageSm: item.artworkUrl100 ?? '',
      previewUrl: item.previewUrl ?? null,
      durationMs: item.trackTimeMillis ?? 0,
    }))

    return NextResponse.json({ tracks })
  } catch (err) {
    console.error('Search error:', err)
    return NextResponse.json({ error: 'Recherche indisponible' }, { status: 500 })
  }
}
