import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { selectHasPoolData, selectPoolPnLSummary, usePnLStore } from '../stores/pnlStore'
import { updatePortfolioWidget } from '../widgets/updatePortfolioWidget'

/**
 * Syncs portfolio summary data to the Android home screen widget.
 * Call this from the positions screen — it watches the PnL store
 * and pushes updates to the widget whenever data changes.
 */
export function usePortfolioWidget(walletAddress: string | undefined, positionCount: number, poolAddresses: string[]) {
  const wallet = walletAddress || ''

  const summary = usePnLStore(useShallow(selectPoolPnLSummary(wallet, poolAddresses)))
  const hasData = usePnLStore(selectHasPoolData(wallet, poolAddresses))

  // Track previous summary to avoid unnecessary updates
  const prevSummaryRef = useRef<string>('')

  useEffect(() => {
    if (!hasData || positionCount === 0) return

    const key = JSON.stringify(summary)
    if (key === prevSummaryRef.current) return
    prevSummaryRef.current = key

    updatePortfolioWidget(summary, positionCount)
  }, [summary, positionCount, hasData])
}
