import { useEffect, useState } from 'react'
import { fetchTokenPriceData, type TokenInfo } from '../../tokens'

export function useTokenData(tokenXMint: string, tokenYMint: string) {
  const [tokenXInfo, setTokenXInfo] = useState<TokenInfo | null>(null)
  const [tokenYInfo, setTokenYInfo] = useState<TokenInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError(null)

    Promise.all([fetchTokenPriceData(tokenXMint), fetchTokenPriceData(tokenYMint)])
      .then(([xData, yData]) => {
        if (isMounted) {
          setTokenXInfo(xData)
          setTokenYInfo(yData)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch token data'))
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [tokenXMint, tokenYMint])

  return {
    tokenXInfo,
    tokenYInfo,
    isLoading,
    error,
  }
}
