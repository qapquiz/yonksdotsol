import { syncPortfolioWidget } from './syncPortfolioWidget'
import type { WidgetSyncResult } from './syncPortfolioWidget'
import { syncPositionWidgets } from './syncPositionWidgets'

export async function syncWidgets(showRefreshing = false): Promise<WidgetSyncResult> {
  const results = await Promise.all([syncPortfolioWidget(showRefreshing), syncPositionWidgets(showRefreshing)])
  if (results.includes('failed')) return 'failed'
  return results.includes('updated') ? 'updated' : 'no-data'
}
