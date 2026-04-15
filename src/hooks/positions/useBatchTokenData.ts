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

    const settled = Promise.allSettled(mints.map((mint) => fetchTokenPriceData(mint).then((info) => [mint, info] as const)))

    settled.then((results) => {
      if (!isMounted) return

      const data = new Map<string, TokenInfo>()
      let firstError: Error | null = null

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const [mint, info] = result.value
          data.set(mint, info)
        } else if (!firstError) {
          firstError = result.reason instanceof Error ? result.reason : new Error(String(result.reason))
        }
      }

      setTokenData(data)
      setIsLoading(false)
      setError(firstError)
    })

    return () => {
      isMounted = false
    }
  }, [mints, enabled])

  return { tokenData, isLoading, error }
}
