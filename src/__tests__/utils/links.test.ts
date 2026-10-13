import { describe, it, expect } from 'vitest'
import { meteoraPoolUrl } from '../../utils/links'

describe('meteoraPoolUrl', () => {
  it('builds the Meteora DLMM pool page URL', () => {
    expect(meteoraPoolUrl('PAIR')).toBe('https://app.meteora.ag/dlmm/PAIR')
  })
})
