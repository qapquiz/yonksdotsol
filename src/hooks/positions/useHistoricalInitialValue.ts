import { useState, useEffect } from 'react'
import { fetchPoolPriceAtTimestamp } from '../../utils/positions/meteora-ohlcv'
import { fetchHistoricalSOLPrice } from '../../utils/positions/pyth-benchmarks'
import type { CostBasisWithTransactions } from '../../utils/positions/transaction-parser'

const BATCH_SIZE = 5
const RATE_LIMIT_DELAY = 1000

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
  tokenYSymbol: string
  enabled?: boolean
}

export function useHistoricalInitialValue({
  poolAddress,
  costBasis,
  tokenXDecimals,
  tokenYDecimals,
  tokenYSymbol,
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

        const tokenType = tokenYSymbol.toLowerCase()
        const isSol = tokenType === 'sol'
        const isUsdc = tokenType === 'usdc'
        const isSolOrUsdc = isSol || isUsdc

        if (!isSolOrUsdc) {
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
            let solUsdPrice: number | null = 1

            if (isSol) {
              solUsdPrice = await fetchHistoricalSOLPrice(tx.blockTime!)
            }

            return { tx, poolPrice, solUsdPrice }
          })

          const priceResults = await Promise.all(pricePromises)

          for (const { tx, poolPrice, solUsdPrice } of priceResults) {
            if (poolPrice === null || (isSol && solUsdPrice === null)) {
              foundAllPrices = false
              break
            }

            const xDivisor = 10n ** BigInt(tokenXDecimals)
            const yDivisor = 10n ** BigInt(tokenYDecimals)

            if (isSol) {
              const xAmountUSD = (Number(tx.xAmount) / Number(xDivisor)) * poolPrice * solUsdPrice!
              const yAmountUSD = (Number(tx.yAmount) / Number(yDivisor)) * solUsdPrice!
              initialValueUSD += xAmountUSD + yAmountUSD
            } else if (isUsdc) {
              const xAmountUSD = (Number(tx.xAmount) / Number(xDivisor)) * poolPrice
              const yAmountUSD = (Number(tx.yAmount) / Number(yDivisor)) * 1
              initialValueUSD += xAmountUSD + yAmountUSD
            }
          }

          if (!foundAllPrices) break

          if (i + BATCH_SIZE < addTransactions.length) {
            await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY))
          }
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
  }, [poolAddress, costBasis, tokenXDecimals, tokenYDecimals, tokenYSymbol, enabled])

  return state
}
