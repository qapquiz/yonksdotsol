import { useEffect, useState } from 'react'
import { fetchTokenPriceData, type TokenInfo } from '../../tokens'

interface UseBatchTokenDataProps {
  mints: string[]
  enabled: boolean
}

interface UseBatchTokenDataResult {
  tokenData: Map<string, TokenInfo>
  isLoading: boolean
  error: Error | null
}

export function useBatchTokenData({ mints, enabled }: UseBatchTokenDataProps): UseBatchTokenDataResult {
  const [tokenData, setTokenData] = useState<Map<string, TokenInfo>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled || mints.length === 0) {
      setTokenData(new Map())
      setIsLoading(false)
      setError(null)
      return
    }

    let isMounted = true

    setIsLoading(true)
    setError(null)

    const accumulated = new Map<string, TokenInfo>()
    let pending = mints.length
    let firstError: Error | null = null
    let flushScheduled = false

    const flush = () => {
      if (!isMounted) return
      flushScheduled = false
      setTokenData(new Map(accumulated))
      if (pending === 0) {
        setIsLoading(false)
        setError(firstError)
      }
    }

    const scheduleFlush = () => {
      if (!flushScheduled) {
        flushScheduled = true
        queueMicrotask(flush)
      }
    }

    for (const mint of mints) {
      fetchTokenPriceData(mint)
        .then((info) => {
          if (!isMounted) return
          accumulated.set(mint, info)
          pending--
          scheduleFlush()
        })
        .catch((err) => {
          if (!isMounted) return
          if (!firstError) {
            firstError = err instanceof Error ? err : new Error(String(err))
          }
          pending--
          scheduleFlush()
        })
    }

    return () => {
      isMounted = false
    }
  }, [mints, enabled])

  return { tokenData, isLoading, error }
}
