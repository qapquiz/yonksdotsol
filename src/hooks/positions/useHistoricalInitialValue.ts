import { useState, useEffect } from 'react'
import { fetchPoolPriceAtTimestamp } from '../../utils/positions/meteora-ohlcv'
import type { CostBasisWithTransactions } from '../../utils/positions/transaction-parser'

const BATCH_SIZE = 5

interface UseHistoricalInitialValueResult {
  initialValue: number
  isLoading: boolean
  error: Error | null
}

interface UseHistoricalInitialValueProps {
  poolAddress: string
  costBasis: CostBasisWithTransactions | null
  tokenXDecimals: number
  tokenYDecimals: number
  enabled?: boolean
}

export function useHistoricalInitialValue({
  poolAddress,
  costBasis,
  tokenXDecimals,
  tokenYDecimals,
  enabled = true,
}: UseHistoricalInitialValueProps): UseHistoricalInitialValueResult {
  const [state, setState] = useState<UseHistoricalInitialValueResult>({
    initialValue: 0,
    isLoading: false,
    error: null,
  })

  useEffect(() => {
    let isMounted = true

    const calculateInitialValue = async () => {
      if (!enabled || !costBasis || costBasis.transactions.length === 0) {
        setState({ initialValue: 0, isLoading: false, error: null })
        return
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const addTransactions = costBasis.transactions.filter((tx) => tx.operation === 'add' && tx.blockTime !== null)

        if (addTransactions.length === 0) {
          if (isMounted) {
            setState({ initialValue: 0, isLoading: false, error: null })
          }
          return
        }

        let initialValueUSD = 0
        let foundAllPrices = true

        for (let i = 0; i < addTransactions.length; i += BATCH_SIZE) {
          const batch = addTransactions.slice(i, i + BATCH_SIZE)

          const pricePromises = batch.map(async (tx) => {
            const poolPrice = await fetchPoolPriceAtTimestamp(poolAddress, tx.blockTime!, '5m')
            return { tx, poolPrice }
          })

          const priceResults = await Promise.all(pricePromises)

          for (const { tx, poolPrice } of priceResults) {
            if (poolPrice === null) {
              foundAllPrices = false
              break
            }

            const xDivisor = 10n ** BigInt(tokenXDecimals)
            const yDivisor = 10n ** BigInt(tokenYDecimals)

            const xAmountUSD = (Number(tx.xAmount) / Number(xDivisor)) * poolPrice
            const yAmountUSD = (Number(tx.yAmount) / Number(yDivisor)) * (1 / poolPrice)

            initialValueUSD += xAmountUSD + yAmountUSD
          }

          if (!foundAllPrices) break
        }

        if (isMounted) {
          if (!foundAllPrices) {
            setState({
              initialValue: 0,
              isLoading: false,
              error: null,
            })
          } else {
            setState({
              initialValue: initialValueUSD,
              isLoading: false,
              error: null,
            })
          }
        }
      } catch (error) {
        if (isMounted) {
          setState({
            initialValue: 0,
            isLoading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          })
        }
      }
    }

    calculateInitialValue()

    return () => {
      isMounted = false
    }
  }, [poolAddress, costBasis, tokenXDecimals, tokenYDecimals, enabled])

  return state
}
