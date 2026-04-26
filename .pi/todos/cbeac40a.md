{
"id": "cbeac40a",
"title": "Finish RFC-02: Make PositionCard and PortfolioSummary pure presentational",
"tags": [
"rfc-02",
"cleanup"
],
"status": "closed",
"created_at": "2026-04-26T17:47:16.303Z"
}

PositionCard and PortfolioSummary still read from usePnLStore and recompute view models internally. `usePositionsPage` already computes both `vm` and `summary` — these components should accept them as props instead.

**PositionCard**: Accept `viewModel: PositionViewModel` prop, remove store subscription, remove internal `computePositionViewData` call. Delete unused `useMemo` selectors.

**PortfolioSummary**: Accept `summary: PortfolioSummaryData` and `hasData: boolean` props, remove store subscription, remove internal `computePoolPnLSummary` call.

**PositionsList**: Forward `summary` from props into `PortfolioSummary`. Pass `resolved.vm` into `PositionCard` instead of individual token info + wallet + pool address.
