---
title: computePositionViewData
type: entity
location: src/utils/positions/computePositionViewData.ts
created: 2026-04-28
updated: 2026-04-28
tags: [utility, positions, pure-function]
related:
  - PositionInfo
  - PositionCard
  - LiquidityBarChart
  - Number Formatting
---

# computePositionViewData

Pure function that transforms raw position data into a display-ready view model.

## Location

`src/utils/positions/computePositionViewData.ts`

## Responsibilities

- Calculates total position value in USD
- Determines if position is in active bin range
- Formats current price, fees, and fee values
- Generates liquidity shape data for charts
- Incorporates PnL data from external API

## Input

```typescript
interface ComputePositionViewDataInput {
  positionData: PositionData | undefined
  activeId: number
  positionAddress: string
  poolAddress: string
  tokenXInfo: TokenInfo | null
  tokenYInfo: TokenInfo | null
  pnlData: PositionPnLData | null
}
```

## Output

```typescript
interface PositionViewModel {
  totalValue: string
  inRange: boolean
  currentPrice: string
  unrealizedFeesDisplay: string
  claimedFeesDisplay: string
  unrealizedFeesValue: string
  claimedFeesValue: string
  liquidityShape: LiquidityShape | null
  pnlSol: number | null
  pnlSolPctChange: number | null
}
```

## Key Behaviors

- Returns `$0.00` / `-` placeholders when token data is missing
- Uses `BigInt` for precise token amount calculations
- Formats all values via [[Number Formatting]] utilities

## See Also

- [[PositionInfo]] — raw data structure
- [[PositionCard]] — primary consumer of view model
- [[LiquidityBarChart]] — consumes `liquidityShape`
- [[Number Formatting]] — formatting utilities
