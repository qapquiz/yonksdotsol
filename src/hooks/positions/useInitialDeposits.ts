import { useState, useEffect } from 'react'
import { createSolanaRpc } from '@solana/kit'
import { getInitialDeposits, type InitialDepositsResult } from '../../utils/positions/transaction-parser'
import { CacheManager } from '../../utils/cache/CacheManager'
import { getInitialDepositsKey } from '../../utils/cache/cacheKeys'
import { CACHE_TTL } from '../../config/cache'

interface UseInitialDepositsProps {
  rpcUrl: string
  positionPublicKey: string
  tokenXDecimals: number
  tokenYDecimals: number
  enabled?: boolean
}

interface UseInitialDepositsResult {
  initialDeposits: InitialDepositsResult | null
  isLoading: boolean
  error: Error | null
}

export function useInitialDeposits({
  rpcUrl,
  positionPublicKey,
  tokenXDecimals,
  tokenYDecimals,
  enabled = true,
}: UseInitialDepositsProps): UseInitialDepositsResult {
  const [state, setState] = useState<UseInitialDepositsResult>({
    initialDeposits: null,
    isLoading: false,
    error: null,
  })

  useEffect(() => {
    let isMounted = true

    const fetchDeposits = async () => {
      if (!enabled) return

      const cacheKey = getInitialDepositsKey(positionPublicKey)
      const cacheManager = CacheManager.getInstance()
      const cachedValue = cacheManager.get<InitialDepositsResult>(cacheKey)

      if (cachedValue !== null) {
        setState({
          initialDeposits: cachedValue,
          isLoading: false,
          error: null,
        })
        return
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const rpc = createSolanaRpc(rpcUrl)
        const result = await getInitialDeposits(rpc, positionPublicKey, tokenXDecimals, tokenYDecimals)

        if (result !== null && isMounted) {
          cacheManager.set(cacheKey, result, CACHE_TTL.INITIAL_DEPOSITS)
          setState({
            initialDeposits: result,
            isLoading: false,
            error: null,
          })
        } else if (isMounted) {
          setState({
            initialDeposits: null,
            isLoading: false,
            error: null,
          })
        }
      } catch (error) {
        if (isMounted) {
          setState({
            initialDeposits: null,
            isLoading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          })
        }
      }
    }

    fetchDeposits()

    return () => {
      isMounted = false
    }
  }, [rpcUrl, positionPublicKey, tokenXDecimals, tokenYDecimals, enabled])

  return state
}
