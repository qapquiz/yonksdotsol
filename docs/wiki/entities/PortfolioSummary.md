---
title: PortfolioSummary
type: entity
location: src/components/positions/PortfolioSummary.tsx
created: 2026-04-19
updated: 2026-04-19
tags: [component, portfolio, pnl, sol]
related:
  - PnLStore
  - ShimmerBlock
  - Number Formatting
---

# PortfolioSummary

Aggregated portfolio PnL summary component displaying total value, deposited amount, unclaimed fees, and profit/loss in SOL.

## Location

`src/components/positions/PortfolioSummary.tsx`

## Props

```typescript
interface PortfolioSummaryProps {
  walletAddress?: string
  positionCount: number
  poolAddresses: string[]
}
```

## Features

### SOL Value Display

Displays values in SOL with special formatting for very small amounts:

- Values ≥ 0.01: Standard display (`0.5000`)
- Values < 0.01: Superscript notation (`0.00⁴5000`)

The `SolValue` component handles this formatting automatically.

### PnL Indicators

- **Positive PnL**: Emerald green (`text-emerald-400`) with `+` prefix
- **Negative PnL**: Red (`text-red-400`) with `-` prefix
- **Percentage**: Shown below SOL value

### Loading State

Shows shimmer placeholders when:

- `positionCount > 0` AND
- No pool data exists in store

Uses `ShimmerBlock` for skeleton animation.

## Data Source

Reads from `pnlStore` using selectors:

- `selectPoolPnLSummary(wallet, poolAddresses)` — Aggregated values
- `selectHasPoolData(wallet, poolAddresses)` — Loading state check

Returns:

```typescript
{
  totalPnlSol: number
  totalPnlPercent: number
  totalValueSol: number
  totalInitialDepositSol: number
  totalUnclaimedFeesSol: number
}
```

## Styling

- Container: `bg-app-surface rounded-3xl p-5 mb-4 border border-app-border`
- Labels: `text-app-text-muted text-[10px] font-pixel tracking-wider`
- Values: `text-2xl font-pixel`

## See Also

- [[PnLStore]] — Data source
- [[ShimmerBlock]] — Loading skeleton
- [[Number Formatting]] — SOL formatting conventions
