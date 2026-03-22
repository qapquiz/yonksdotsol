import { useState, useEffect } from 'react'
import { Connection, PublicKey } from '@solana/web3.js'
import { getUpnlPerPosition, type PositionUpnl } from 'metcomet'
import { CacheManager } from '../../utils/cache/CacheManager'
import { getUpnlPerPositionKey } from '../../utils/cache/cacheKeys'
import { CACHE_TTL } from '../../config/cache'

export type { PositionUpnl }

interface UseUpnlPerPositionProps {
  walletAddress: string
  enabled?: boolean
}

interface UseUpnlPerPositionResult {
  data: Map<string, PositionUpnl> | null
  isLoading: boolean
  error: Error | null
}

export function useUpnlPerPosition({
  walletAddress,
  enabled = true,
}: UseUpnlPerPositionProps): UseUpnlPerPositionResult {
  const [state, setState] = useState<UseUpnlPerPositionResult>({
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

      const cacheKey = getUpnlPerPositionKey(walletAddress)
      const cacheManager = CacheManager.getInstance()
      const cachedValue = cacheManager.get<UseUpnlPerPositionResult>(cacheKey)

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

        const result = await getUpnlPerPosition({
          connection,
          walletAddress: publicKey,
          heliusApiKey,
        })

        const dataMap = new Map<string, PositionUpnl>()
        if (result) {
          for (const pos of result) {
            dataMap.set(pos.positionAddress, pos)
          }
        }

        const newState: UseUpnlPerPositionResult = {
          data: dataMap,
          isLoading: false,
          error: null,
        }

        if (isMounted) {
          cacheManager.set(cacheKey, newState, CACHE_TTL.UPNL_PER_POSITION)
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
