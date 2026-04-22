import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CacheManager } from '../../utils/cache/CacheManager'

describe('CacheManager', () => {
  let cache: CacheManager

  beforeEach(() => {
    // Get fresh instance and clear it
    cache = CacheManager.getInstance()
    cache.clear()
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
      const fetchFn = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve('fetched')
          }, 10)
        })
      })

      // Start two concurrent requests
      const [result1, result2] = await Promise.all([cache.getOrFetch('key', fetchFn), cache.getOrFetch('key', fetchFn)])

      expect(result1).toBe('fetched')
      expect(result2).toBe('fetched')
      expect(fetchFn).toHaveBeenCalledTimes(1) // Only one fetch
    })

    it('propagates fetch errors', async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error('fetch failed'))

      await expect(cache.getOrFetch('key', fetchFn)).rejects.toThrow('fetch failed')
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
})
