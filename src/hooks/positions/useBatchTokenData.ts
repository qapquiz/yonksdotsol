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
    let pending = mints.length
    let firstError: Error | null = null

    setIsLoading(true)
    setError(null)

    const newMap = new Map<string, TokenInfo>()
    setTokenData(newMap)

    for (const mint of mints) {
      fetchTokenPriceData(mint)
        .then((tokenInfo) => {
          if (!isMounted) return
          newMap.set(mint, tokenInfo)
          setTokenData(new Map(newMap))
          pending--
          if (pending === 0 && isMounted) {
            setIsLoading(false)
            setError(firstError)
          }
        })
        .catch((err) => {
          if (!isMounted) return
          if (!firstError) {
            firstError = err instanceof Error ? err : new Error(String(err))
          }
          pending--
          if (pending === 0 && isMounted) {
            setIsLoading(false)
            setError(firstError)
          }
        })
    }

    return () => {
      isMounted = false
    }
  }, [mints, enabled])

  return { tokenData, isLoading, error }
}
