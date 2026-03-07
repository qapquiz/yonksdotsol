import { useState, useEffect } from 'react'
import {
  getPositionInitialDepositHeliusEnhanced,
  type InitialDeposit,
} from '../../utils/positions/helius-initial-deposit'
import { CacheManager } from '../../utils/cache/CacheManager'
import { getInitialDepositsHeliusKey } from '../../utils/cache/cacheKeys'
import { CACHE_TTL } from '../../config/cache'

interface UseInitialDepositsHeliusProps {
  positionAddress: string
  ownerAddress: string
  enabled?: boolean
}

interface UseInitialDepositsHeliusResult {
  initialDeposits: InitialDeposit[]
  totalValue: number
  isLoading: boolean
  error: Error | null
}

export function useInitialDepositsHelius({
  positionAddress,
  ownerAddress,
  enabled = true,
}: UseInitialDepositsHeliusProps): UseInitialDepositsHeliusResult {
  const [state, setState] = useState<UseInitialDepositsHeliusResult>({
    initialDeposits: [],
    totalValue: 0,
    isLoading: false,
    error: null,
  })

  useEffect(() => {
    let isMounted = true

    const fetchDeposits = async () => {
      console.log('useInitialDepositsHelius called', {
        positionAddress,
        ownerAddress,
        enabled,
      })

      if (!enabled) {
        console.log('useInitialDepositsHelius: disabled, skipping fetch')
        return
      }

      const apiKey = process.env.EXPO_PUBLIC_HELIUS_API_KEY
      if (!apiKey) {
        console.error('Helius API key not configured')
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: new Error('Helius API key not configured'),
          }))
        }
        return
      }

      const cacheKey = getInitialDepositsHeliusKey(positionAddress)
      const cacheManager = CacheManager.getInstance()
      const cachedValue = cacheManager.get<UseInitialDepositsHeliusResult>(cacheKey)

      if (cachedValue !== null) {
        setState({
          ...cachedValue,
          isLoading: false,
          error: null,
        })
        return
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const result = await getPositionInitialDepositHeliusEnhanced(positionAddress, ownerAddress, apiKey)

        const totalTokenValue = result.initialDeposits.reduce((sum, deposit) => sum + deposit.uiAmount, 0)

        const totalValue = totalTokenValue

        console.log(
          `Initial deposit for ${positionAddress}:`,
          `$${totalValue.toFixed(2)}`,
          `(Tokens only, native SOL excluded)`,
        )

        const newState: UseInitialDepositsHeliusResult = {
          initialDeposits: result.initialDeposits,
          totalValue,
          isLoading: false,
          error: null,
        }

        if (isMounted) {
          cacheManager.set(cacheKey, newState, CACHE_TTL.INITIAL_DEPOSITS)
          setState(newState)
        }
      } catch (error) {
        if (isMounted) {
          setState({
            initialDeposits: [],
            totalValue: 0,
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
  }, [positionAddress, ownerAddress, enabled])

  return state
}
