import { describe, it, expect } from 'vitest'
import { dictionaryScreen, normalize } from '@/lib/moderation'

const TOXIC = [
  'sale gay', 'sale pd', 'espèce de connard', 'connard', 'je te baise passe',
  'tu es un gros con', 'ferme ta gueule', 'fils de pute', 'nique ta mère',
  'va te faire enculer', 'sale juif', 'grosse pute', 'salope', 'enculé',
  'c o n n a r d', 'c0nnard', 'pd va', 'sale gouine', 'gros débile', 'fdp',
  'espece de mongol', 'sale race', 'fuck you', 'kys', 'sombre con',
]

const BENIGN = [
  'super soirée !', 'on adore ce son', 'un baiser pour toi', 'gay pride parade',
  'salut à tous', 'sale temps mais ambiance au top', 'la grosse soirée du vendredi',
  'conseil : monte le son', 'je crève de rire', 'quelle réputation', 'concours de danse',
  'trop bien la salopette de DJ', 'un bisou', 'belle prestation',
]

describe('moderation · dictionnaire', () => {
  it('bloque tous les messages toxiques', () => {
    const missed = TOXIC.filter(m => dictionaryScreen(m).ok)
    expect(missed).toEqual([])
  })

  it('ne bloque aucun message bénin (zéro faux positif)', () => {
    const flagged = BENIGN.filter(m => !dictionaryScreen(m).ok)
    expect(flagged).toEqual([])
  })

  it('normalise leet, accents et répétitions', () => {
    expect(normalize('Çà C0nnâârd!!!')).toBe('ca connaard')
  })
})
