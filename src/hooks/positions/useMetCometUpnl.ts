import { useState, useEffect } from 'react'
import { Connection, PublicKey } from '@solana/web3.js'
import { getUpnl, type UpnlResult } from 'metcomet'
import { CacheManager } from '../../utils/cache/CacheManager'
import { getMetCometUpnlKey } from '../../utils/cache/cacheKeys'
import { CACHE_TTL } from '../../config/cache'

export type { UpnlResult }

interface UseMetCometUpnlProps {
  walletAddress: string
  enabled?: boolean
}

interface UseMetCometUpnlResult {
  data: UpnlResult | null
  isLoading: boolean
  error: Error | null
}

export function useMetCometUpnl({ walletAddress, enabled = true }: UseMetCometUpnlProps): UseMetCometUpnlResult {
  const [state, setState] = useState<UseMetCometUpnlResult>({
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

      const cacheKey = getMetCometUpnlKey(walletAddress)
      const cacheManager = CacheManager.getInstance()
      const cachedValue = cacheManager.get<UseMetCometUpnlResult>(cacheKey)

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

        const newState: UseMetCometUpnlResult = {
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
