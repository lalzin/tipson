import { NextRequest, NextResponse } from 'next/server'
import { searchSpotifyTracks } from '@/lib/spotify'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ tracks: [] })
  }

  try {
    const tracks = await searchSpotifyTracks(q.trim())
    return NextResponse.json({ tracks })
  } catch (err) {
    console.error('Spotify search error:', err)
    return NextResponse.json({ error: 'Recherche impossible' }, { status: 500 })
  }
}
