import type { MusicLinks } from '@/types'

/** Liens de recherche profonds (ouvrent l'app/web sur la recherche du morceau). */
export function searchLinks(song: string, artist: string): MusicLinks {
  const q = encodeURIComponent(`${song} ${artist}`.trim())
  return {
    spotify: `https://open.spotify.com/search/${q}`,
    deezer: `https://www.deezer.com/search/${q}`,
    appleMusic: `https://music.apple.com/search?term=${q}`,
    // Odesli ne fournit pas Beatport → lien de recherche (utile pour les DJ).
    beatport: `https://www.beatport.com/search?q=${q}`,
  }
}

/** Fusionne des liens exacts (Odesli) avec des liens de recherche en repli. */
export function mergeWithSearch(exact: MusicLinks | null, song: string, artist: string): MusicLinks {
  const fallback = searchLinks(song, artist)
  return {
    spotify: exact?.spotify || fallback.spotify,
    deezer: exact?.deezer || fallback.deezer,
    appleMusic: exact?.appleMusic || fallback.appleMusic,
    youtube: exact?.youtube,
    beatport: exact?.beatport || fallback.beatport,
  }
}

/**
 * Résout les liens multi-plateformes (Deezer, Apple Music, Spotify, YouTube)
 * d'un morceau via l'API Odesli (song.link), à partir de son URL iTunes.
 *
 * Limites de débit : sans clé, ~10 req/min. Une clé (SONGLINK_API_KEY) lève cette
 * limite. En cas de 429 (« too many requests »), on renvoie { rateLimited: true }
 * et l'appelant n'affiche aucun lien.
 */
export async function resolveMusicLinks(itunesUrl: string): Promise<
  { links: MusicLinks } | { rateLimited: true } | { error: string }
> {
  const params = new URLSearchParams({ url: itunesUrl, userCountry: 'FR' })
  const apiKey = process.env.SONGLINK_API_KEY
  if (apiKey) params.set('key', apiKey)

  let res: Response
  try {
    res = await fetch(`https://api.song.link/v1-alpha.1/links?${params.toString()}`, {
      // cache CDN court côté Next pour limiter les appels répétés
      next: { revalidate: 3600 },
    })
  } catch {
    return { error: 'network' }
  }

  if (res.status === 429) return { rateLimited: true }
  if (!res.ok) return { error: `status ${res.status}` }

  const data = await res.json().catch(() => null)
  const byPlatform = data?.linksByPlatform ?? {}

  const links: MusicLinks = {
    spotify: byPlatform.spotify?.url,
    deezer: byPlatform.deezer?.url,
    appleMusic: byPlatform.appleMusic?.url ?? byPlatform.itunes?.url,
    youtube: byPlatform.youtube?.url ?? byPlatform.youtubeMusic?.url,
  }

  return { links }
}
