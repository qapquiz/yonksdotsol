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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Keep a ref to mints so the effect can compare stably
  const mintsRef = useRef(mints)
  mintsRef.current = mints

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

    const promises = mints.map((mint) =>
      fetchTokenPriceData(mint)
        .then((info) => [mint, info] as const)
        .catch((err) => {
          return [mint, err instanceof Error ? err : new Error(String(err))] as const
        }),
    )

    Promise.allSettled(promises).then((results) => {
      if (!isMounted) return

      const data = new Map<string, TokenInfo>()
      let firstError: Error | null = null

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const [mint, value] = result.value
          if (value instanceof Error) {
            if (!firstError) firstError = value
          } else {
            data.set(mint, value)
          }
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
