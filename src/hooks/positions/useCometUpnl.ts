import { useState, useEffect } from 'react'
import { Connection, PublicKey } from '@solana/web3.js'
import { getUpnl, type UpnlResult } from 'comet'
import { CacheManager } from '../../utils/cache/CacheManager'
import { getCometUpnlKey } from '../../utils/cache/cacheKeys'
import { CACHE_TTL } from '../../config/cache'

export type { UpnlResult }

interface UseCometUpnlProps {
  walletAddress: string
  enabled?: boolean
}

interface UseCometUpnlResult {
  data: UpnlResult | null
  isLoading: boolean
  error: Error | null
}

export function useCometUpnl({ walletAddress, enabled = true }: UseCometUpnlProps): UseCometUpnlResult {
  const [state, setState] = useState<UseCometUpnlResult>({
    data: null,
    isLoading: false,
    error: null,
  })

  useEffect(() => {
    let isMounted = true

    const fetchUpnl = async () => {
      if (!enabled || !walletAddress) {
        return
      }

      const rpcUrl = process.env.EXPO_PUBLIC_RPC_URL
      const heliusApiKey = process.env.EXPO_PUBLIC_HELIUS_API_KEY

      if (!rpcUrl || !heliusApiKey) {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: new Error('RPC URL or Helius API key not configured'),
          }))
        }
        return
      }

      const cacheKey = getCometUpnlKey(walletAddress)
      const cacheManager = CacheManager.getInstance()
      const cachedValue = cacheManager.get<UseCometUpnlResult>(cacheKey)

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
        const connection = new Connection(rpcUrl)
        const publicKey = new PublicKey(walletAddress)

        const result = await getUpnl({
          connection,
          walletAddress: publicKey,
          heliusApiKey,
        })

        const newState: UseCometUpnlResult = {
          data: result,
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
            data: null,
            isLoading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          })
        }
      }
    }

    fetchUpnl()

    return () => {
      isMounted = false
    }
  }, [walletAddress, enabled])

  return state
}
