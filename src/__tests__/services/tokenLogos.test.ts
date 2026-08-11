import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CacheManager } from '../../utils/cache/CacheManager'
import { fetchTokenLogo, getTokenLogos, MAX_CONCURRENCY } from '../../services/tokenLogos'

const SOL = 'So11111111111111111111111111111111111111112'
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

function jupHit(mint: string, symbol: string, icon: string) {
  return { id: mint, name: symbol, symbol, icon }
}

function res(body: unknown, init: { ok?: boolean; status?: number; headers?: Record<string, string> } = {}) {
  const ok = init.ok ?? true
  return {
    ok,
    status: init.status ?? (ok ? 200 : 500),
    headers: new Map(Object.entries(init.headers ?? {})) as Map<string, string>,
    json: () => Promise.resolve(body),
  }
}

describe('fetchTokenLogo', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses an exact-mint hit into a TokenLogo (icon → cdn_url)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res([jupHit(SOL, 'SOL', 'https://x/sol.png')])))

    const result = await fetchTokenLogo(SOL)

    expect(result).toEqual({ mint: SOL, symbol: 'SOL', cdn_url: 'https://x/sol.png' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns null on a fuzzy miss (no entry with id === mint)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res([jupHit('some-other-mint', 'FAKE', 'https://x/f.png')])))

    const result = await fetchTokenLogo(SOL)

    expect(result).toBeNull()
  })

  it('returns null on an empty result set', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res([])))

    await expect(fetchTokenLogo(SOL)).resolves.toBeNull()
  })

  it('tolerates a missing icon field (cdn_url → null)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res([{ id: SOL, symbol: 'SOL' }])))

    const result = await fetchTokenLogo(SOL)

    expect(result).toEqual({ mint: SOL, symbol: 'SOL', cdn_url: null })
  })

  it('retries once on 429 then succeeds (honoring Retry-After)', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(res([], { ok: false, status: 429, headers: { 'retry-after': '2' } }))
      .mockResolvedValueOnce(res([jupHit(SOL, 'SOL', 'https://x/sol.png')]))

    vi.stubGlobal('fetch', fetchMock)

    const pending = fetchTokenLogo(SOL)
    // Advance past the Retry-After backoff (2s, under the cap).
    await vi.advanceTimersByTimeAsync(2000)
    const result = await pending

    expect(result).toEqual({ mint: SOL, symbol: 'SOL', cdn_url: 'https://x/sol.png' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws after exhausting retries on a persistent 429', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(res([], { ok: false, status: 429, headers: { 'retry-after': '1' } })),
    )

    const pending = fetchTokenLogo(SOL)
    // Attach the rejection handler synchronously, *before* advancing timers,
    // so the rejection (which fires mid-advance) is never momentarily unhandled.
    const assertion = expect(pending).rejects.toThrow('Token logo HTTP error: 429')
    await vi.advanceTimersByTimeAsync(2000)
    await assertion
  })

  it('throws immediately on a non-429 HTTP error (no retry)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(null, { ok: false, status: 500 })))

    await expect(fetchTokenLogo(SOL)).rejects.toThrow('Token logo HTTP error: 500')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

describe('getTokenLogos', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds a mint→logo map, skipping misses and deduping input', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        const q = new URL(url).searchParams.get('query')
        if (q === SOL) return Promise.resolve(res([jupHit(SOL, 'SOL', 'https://x/sol.png')]))
        if (q === USDC) return Promise.resolve(res([jupHit(USDC, 'USDC', 'https://x/usdc.png')]))
        return Promise.resolve(res([])) // miss
      }),
    )

    const cache = CacheManager.createFresh()
    // Duplicate SOL to verify dedupe → one fetch.
    const map = await getTokenLogos([SOL, SOL, USDC, 'unknown-mint'], cache)

    expect(map.get(SOL)).toEqual({ mint: SOL, symbol: 'SOL', cdn_url: 'https://x/sol.png' })
    expect(map.get(USDC)).toEqual({ mint: USDC, symbol: 'USDC', cdn_url: 'https://x/usdc.png' })
    expect(map.has('unknown-mint')).toBe(false)
    expect(map.size).toBe(2)
  })

  it('serves repeat lookups from cache (no second fetch)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(res([jupHit(SOL, 'SOL', 'https://x/sol.png')]))
    vi.stubGlobal('fetch', fetchMock)

    const cache = CacheManager.createFresh()
    await getTokenLogos([SOL], cache)
    await getTokenLogos([SOL], cache)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it(`runs at most ${MAX_CONCURRENCY} requests concurrently`, async () => {
    const mints = Array.from({ length: MAX_CONCURRENCY * 3 }, (_, i) => `mint-${i}`)
    let inFlight = 0
    let peak = 0

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        inFlight += 1
        peak = Math.max(peak, inFlight)
        // Yield once so other workers can start before this one resolves.
        await Promise.resolve()
        inFlight -= 1
        const q = new URL(url).searchParams.get('query')
        return res([jupHit(q ?? '', 'T', `https://x/${q}.png`)])
      }),
    )

    const cache = CacheManager.createFresh()
    const map = await getTokenLogos(mints, cache)

    expect(peak).toBeLessThanOrEqual(MAX_CONCURRENCY)
    expect(map.size).toBe(mints.length)
  })
})
