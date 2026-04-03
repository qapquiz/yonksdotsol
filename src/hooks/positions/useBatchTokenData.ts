import { useEffect, useRef, useState } from 'react'
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
  const [error, setError] = useState<Error | null>(null)
  const pendingRef = useRef(0)

  useEffect(() => {
    if (!enabled || mints.length === 0) {
      setTokenData(new Map())
      setError(null)
      return
    }

    let isMounted = true
    setError(null)
    pendingRef.current = mints.length

    const newMap = new Map<string, TokenInfo>()
    setTokenData(newMap)

    for (const mint of mints) {
      fetchTokenPriceData(mint)
        .then((tokenInfo) => {
          if (!isMounted) return
          newMap.set(mint, tokenInfo)
          setTokenData(new Map(newMap))
          pendingRef.current--
          if (pendingRef.current === 0) {
            setError(null)
          }
        })
        .catch((err) => {
          if (!isMounted) return
          pendingRef.current--
          setError((prev) => (prev ? prev : err instanceof Error ? err : new Error(String(err))))
        })
    }

    return () => {
      isMounted = false
    }
  }, [mints, enabled])

  return {
    tokenData,
    isLoading: pendingRef.current > 0 && tokenData.size === 0,
    error,
  }
}
