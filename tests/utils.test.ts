import { describe, it, expect } from 'vitest'
import { formatPrice, generateSessionCode, formatDuration } from '@/lib/utils'

describe('utils', () => {
  it('formatPrice formate des centimes en euros', () => {
    expect(formatPrice(0)).toBe('Gratuit')
    expect(formatPrice(500)).toContain('5')
    expect(formatPrice(150)).toMatch(/1[.,]50/)
  })

  it('generateSessionCode renvoie un code court alphanumérique', () => {
    const code = generateSessionCode()
    expect(code).toMatch(/^[A-Z0-9]+$/)
    expect(code.length).toBeGreaterThanOrEqual(4)
  })

  it('formatDuration formate mm:ss', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(65000)).toBe('1:05')
  })
})
