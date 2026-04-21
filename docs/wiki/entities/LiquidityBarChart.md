---
title: LiquidityBarChart
type: entity
created: 2026-04-19
updated: 2026-04-19
tags: [component, chart, liquidity, svg]
---

# LiquidityBarChart

SVG bar chart visualizing liquidity distribution across price bins in a Meteora DLMM position.

## Location

`src/components/positions/LiquidityBarChart.tsx`

## Props

```typescript
interface LiquidityBarChartProps {
  liquidityShape: LiquidityShape | null
  currentPrice: string
}
```

## Visual Design

### Bar Colors

| State            | Color   | Hex       |
| ---------------- | ------- | --------- |
| Below active bin | Emerald | `#10b981` |
| Active bin       | Cyan    | `#22d3ee` |
| Above active bin | Zinc    | `#3f3f46` |

### Layout

- Chart height: 120px
- Padding: 10px top/bottom
- Bar gap ratio: 30%
- Grid lines: 0%, 25%, 50%, 75%, 100%

### Price Labels

- Min price (left): First bin price
- Max price (right): Last bin price
- Current price: Displayed in top-right badge

## Data Processing

The component calculates:

1. **Max liquidity** — Highest total liquidity across all bins
2. **Bar values** — Each bin's liquidity as percentage of max
3. **Active bin index** — Position of current active bin

### LiquidityShape Type

```typescript
interface LiquidityShape {
  binDistribution: Array<{
    binId: number
    price: number
    positionXAmountInSOL: number
    positionYAmountInSOL: number
  }>
  currentActiveId: number
}
```

## Empty State

When no data is available:

- Shows "No liquidity data" message
- Displays legend with color indicators
- Price range shows `-` placeholders

## Responsive Behavior

Uses `onLayout` callback to measure container width and calculate bar widths dynamically.

## Related

- [[PositionInfo]] — Source of liquidity data
- [[Position Architecture]] — How positions relate to bins
- [[Number Formatting]] — Price display conventions
