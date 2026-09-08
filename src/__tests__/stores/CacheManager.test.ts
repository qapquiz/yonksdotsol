import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CacheManager } from '../../utils/cache/CacheManager'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: Error) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('CacheManager', () => {
  let cache: CacheManager

  beforeEach(() => {
    cache = CacheManager.createFresh()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getInstance', () => {
    it('returns the same instance', () => {
      const instance1 = CacheManager.getInstance()
      const instance2 = CacheManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('get/set', () => {
    it('returns null for missing key', () => {
      expect(cache.get('missing')).toBeNull()
    })

    it('returns value for fresh entry', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    it('stores and retrieves complex objects', () => {
      const obj = { name: 'test', count: 42, nested: { a: 1 } }
      cache.set('obj', obj)
      expect(cache.get('obj')).toEqual(obj)
    })

    it('stores and retrieves arrays', () => {
      const arr = [1, 2, 3, 'test']
      cache.set('arr', arr)
      expect(cache.get('arr')).toEqual(arr)
    })

    it('returns null for expired entry', async () => {
      vi.useFakeTimers()
      cache.set('key', 'value', 100) // 100ms TTL

      vi.advanceTimersByTime(150)

      expect(cache.get('key')).toBeNull()
      vi.useRealTimers()
    })

    it('returns value within TTL', async () => {
      vi.useFakeTimers()
      cache.set('key', 'value', 1000) // 1s TTL

      vi.advanceTimersByTime(500)

      expect(cache.get('key')).toBe('value')
      vi.useRealTimers()
    })

    it('expires at the TTL deadline', () => {
      vi.useFakeTimers()
      cache.set('key', 'value', 100)

      vi.advanceTimersByTime(100)

      expect(cache.has('key')).toBe(false)
      expect(cache.get('key')).toBeNull()
    })

    it('does not retain a value with a zero TTL', () => {
      vi.useFakeTimers()
      cache.set('key', 'value', 0)

      expect(cache.get('key')).toBeNull()
    })
  })

  describe('has', () => {
    it('returns true for fresh entry', () => {
      cache.set('key', 'value')
      expect(cache.has('key')).toBe(true)
    })

    it('returns false for missing key', () => {
      expect(cache.has('missing')).toBe(false)
    })

    it('returns false for expired entry', async () => {
      vi.useFakeTimers()
      cache.set('key', 'value', 100)

      vi.advanceTimersByTime(150)

      expect(cache.has('key')).toBe(false)
      vi.useRealTimers()
    })
  })

  describe('delete', () => {
    it('removes entry', () => {
      cache.set('key', 'value')
      cache.delete('key')
      expect(cache.get('key')).toBeNull()
    })

    it('does not throw for missing key', () => {
      expect(() => cache.delete('missing')).not.toThrow()
    })
  })

  describe('clear', () => {
    it('clears all entries', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.clear()
      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBeNull()
    })
  })

  describe('invalidatePattern', () => {
    it('deletes matching keys', () => {
      cache.set('pool:abc:wallet1', 'data1')
      cache.set('pool:def:wallet1', 'data2')
      cache.set('other:key', 'data3')

      cache.invalidatePattern('pool:abc')

      expect(cache.get('pool:abc:wallet1')).toBeNull()
      expect(cache.get('pool:def:wallet1')).toBe('data2')
      expect(cache.get('other:key')).toBe('data3')
    })

    it('handles no matches', () => {
      cache.set('key1', 'value1')
      cache.invalidatePattern('nonexistent')
      expect(cache.get('key1')).toBe('value1')
    })
  })

  describe('getOrFetch', () => {
    it('caches null results for their TTL', async () => {
      vi.useFakeTimers()
      const fetchFn = vi.fn().mockResolvedValue(null)

      await expect(cache.getOrFetch('key', fetchFn, 100)).resolves.toBeNull()
      await expect(cache.getOrFetch('key', fetchFn, 100)).resolves.toBeNull()
      expect(fetchFn).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(100)
      await expect(cache.getOrFetch('key', fetchFn, 100)).resolves.toBeNull()
      expect(fetchFn).toHaveBeenCalledTimes(2)
    })

    it('returns cached value without calling fetch', async () => {
      const fetchFn = vi.fn().mockResolvedValue('fetched')
      cache.set('key', 'cached')

      const result = await cache.getOrFetch('key', fetchFn)

      expect(result).toBe('cached')
      expect(fetchFn).not.toHaveBeenCalled()
    })

    it('calls fetch when empty', async () => {
      const fetchFn = vi.fn().mockResolvedValue('fetched')

      const result = await cache.getOrFetch('key', fetchFn)

      expect(result).toBe('fetched')
      expect(fetchFn).toHaveBeenCalledTimes(1)
    })

    it('caches fetch result', async () => {
      const fetchFn = vi.fn().mockResolvedValue('fetched')

      await cache.getOrFetch('key', fetchFn)
      const result = await cache.getOrFetch('key', fetchFn)

      expect(result).toBe('fetched')
      expect(fetchFn).toHaveBeenCalledTimes(1) // Only called once
    })

    it('deduplicates concurrent calls', async () => {
      let resolveCount = 0
      const fetchFn = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolveCount++
            resolve('fetched')
          }, 10)
        })
      })

      // Start two concurrent requests
      const [result1, result2] = await Promise.all([cache.getOrFetch('key', fetchFn), cache.getOrFetch('key', fetchFn)])

      expect(result1).toBe('fetched')
      expect(result2).toBe('fetched')
      expect(fetchFn).toHaveBeenCalledTimes(1) // Only one fetch
      expect(resolveCount).toBe(1)
    })

    it('propagates fetch errors', async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error('fetch failed'))

      await expect(cache.getOrFetch('key', fetchFn)).rejects.toThrow('fetch failed')
    })

    it('deduplicates synchronous fetch failures and allows a later retry', async () => {
      const fetchFn = vi.fn((): Promise<string> => {
        throw new Error('fetch failed')
      })

      const results = await Promise.allSettled([cache.getOrFetch('key', fetchFn), cache.getOrFetch('key', fetchFn)])

      expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected'])
      expect(fetchFn).toHaveBeenCalledTimes(1)
      await expect(cache.getOrFetch('key', async () => 'recovered')).resolves.toBe('recovered')
    })

    it('clears pending after error', async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error('fetch failed'))

      // First call fails
      await expect(cache.getOrFetch('key', fetchFn)).rejects.toThrow()

      // Second call should retry (not reuse pending)
      fetchFn.mockResolvedValue('success')
      const result = await cache.getOrFetch('key', fetchFn)

      expect(result).toBe('success')
      expect(fetchFn).toHaveBeenCalledTimes(2)
    })

    it('respects custom TTL', async () => {
      vi.useFakeTimers()
      const fetchFn = vi.fn().mockResolvedValue('fetched')

      // Fetch with 100ms TTL
      const promise = cache.getOrFetch('key', fetchFn, 100)
      await vi.runAllTimersAsync()
      await promise

      // Value should be cached
      expect(cache.get('key')).toBe('fetched')

      // Advance past TTL
      vi.advanceTimersByTime(150)

      // Should be expired now
      expect(cache.get('key')).toBeNull()

      vi.useRealTimers()
    })
  })

  describe.each(['delete', 'clear', 'invalidatePattern'] as const)('%s during a fetch', (method) => {
    const key = 'pnl:pool:wallet'

    function invalidate(manager: CacheManager): void {
      if (method === 'clear') manager.clear()
      else if (method === 'delete') manager.delete(key)
      else manager.invalidatePattern(':wallet')
    }

    it('does not restore invalidated data when an old request completes', async () => {
      const old = deferred<string>()
      const oldRequest = cache.getOrFetch(key, () => old.promise)
      await Promise.resolve()

      invalidate(cache)
      old.resolve('stale')

      await expect(oldRequest).resolves.toBe('stale')
      expect(cache.has(key)).toBe(false)
    })

    it('starts a fresh request after invalidation and protects its result', async () => {
      const old = deferred<string>()
      const oldRequest = cache.getOrFetch(key, () => old.promise)
      await Promise.resolve()
      invalidate(cache)

      const fetchFresh = vi.fn().mockResolvedValue('fresh')
      const freshRequest = cache.getOrFetch(key, fetchFresh)
      // Release both so an incorrect join fails assertions instead of timing out.
      old.resolve('stale')
      await oldRequest

      await expect(freshRequest).resolves.toBe('fresh')
      expect(fetchFresh).toHaveBeenCalledTimes(1)
      expect(cache.get(key)).toBe('fresh')
    })

    it('does not overwrite a newer cached result when the old response arrives last', async () => {
      const old = deferred<string>()
      const oldRequest = cache.getOrFetch(key, () => old.promise)
      await Promise.resolve()
      invalidate(cache)

      // An explicit write also supersedes any previous fetch.
      cache.set(key, 'fresh')
      old.resolve('stale')
      await oldRequest

      expect(cache.get(key)).toBe('fresh')
    })

    it.each(['resolve', 'reject'] as const)(
      'keeps the new request deduplicated when the old one %ss',
      async (outcome) => {
        const old = deferred<string>()
        const fresh = deferred<string>()
        const oldRequest = cache.getOrFetch(key, () => old.promise).catch(() => 'failed')
        await Promise.resolve()
        invalidate(cache)
        const freshRequest = cache.getOrFetch(key, () => fresh.promise)

        if (outcome === 'resolve') old.resolve('stale')
        else old.reject(new Error('old request failed'))
        await oldRequest

        const duplicateFetch = vi.fn().mockResolvedValue('duplicate')
        const joinedRequest = cache.getOrFetch(key, duplicateFetch)
        fresh.resolve('fresh')

        await expect(freshRequest).resolves.toBe('fresh')
        await expect(joinedRequest).resolves.toBe('fresh')
        expect(duplicateFetch).not.toHaveBeenCalled()
        expect(cache.get(key)).toBe('fresh')
      },
    )
  })

  it('preserves unrelated pending requests during pattern invalidation', async () => {
    const pending = deferred<string>()
    const request = cache.getOrFetch('pnl:pool:other-wallet', () => pending.promise)
    cache.invalidatePattern(':wallet')
    const duplicateFetch = vi.fn().mockResolvedValue('duplicate')
    const joinedRequest = cache.getOrFetch('pnl:pool:other-wallet', duplicateFetch)
    pending.resolve('other wallet')

    await expect(request).resolves.toBe('other wallet')
    await expect(joinedRequest).resolves.toBe('other wallet')
    expect(duplicateFetch).not.toHaveBeenCalled()
    expect(cache.get('pnl:pool:other-wallet')).toBe('other wallet')
  })

  it('does not let a pending fetch overwrite an explicit set', async () => {
    const old = deferred<string>()
    const request = cache.getOrFetch('key', () => old.promise)
    await Promise.resolve()
    cache.set('key', 'fresh')
    old.resolve('stale')
    await request

    expect(cache.get('key')).toBe('fresh')
  })
})
