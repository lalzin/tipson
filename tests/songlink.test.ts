import { describe, it, expect } from 'vitest'
import { searchLinks, mergeWithSearch } from '@/lib/songlink'

describe('songlink', () => {
  it('searchLinks génère les liens de recherche encodés (dont Beatport)', () => {
    const l = searchLinks('Strobe', 'Deadmau5')
    expect(l.spotify).toContain('open.spotify.com/search/')
    expect(l.deezer).toContain('deezer.com/search/')
    expect(l.appleMusic).toContain('music.apple.com/search')
    expect(l.beatport).toContain('beatport.com/search?q=')
    expect(l.beatport).toContain('Strobe%20Deadmau5')
  })

  it('mergeWithSearch garde les liens exacts et complète les manquants', () => {
    const merged = mergeWithSearch({ spotify: 'https://exact/spotify' }, 'X', 'Y')
    expect(merged.spotify).toBe('https://exact/spotify')          // exact conservé
    expect(merged.deezer).toContain('deezer.com/search/')          // repli recherche
    expect(merged.beatport).toContain('beatport.com/search')       // toujours présent
  })
})
