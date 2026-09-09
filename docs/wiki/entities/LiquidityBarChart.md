---
title: LiquidityBarChart
type: entity
location: src/components/positions/LiquidityBarChart.tsx
created: 2026-04-19
updated: 2026-09-10
tags: [component, chart, liquidity, svg]
related:
  - PositionInfo
  - Position Architecture
  - Number Formatting
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

| State            | Theme token        |
| ---------------- | ------------------ |
| Below active bin | `tokens.secondary` |
| Active bin       | `tokens.primary`   |
| Above active bin | `tokens.border`    |

The active bin is marked by a 1.5px vertical line with a `3 3` dash pattern and a small top pointer, matching [[PositionLiquidityWidget]]. The line and pointer share a position and slide together over 500ms when the active bin changes. Mounting, recycled positions, and width changes place the marker immediately. Out-of-range positions have no in-chart active marker. Liquidity bars retain their proportional heights, including the active bar; the legend identifies the dashed marker as "Active bin".

### Layout

- Chart height: 120px
- Padding: 10px top/bottom
- Bar gap ratio: 30%
- Grid lines: 0%, 25%, 50%, 75%, 100%

### Price Labels

- Min price (left): First bin price
- Max price (right): Last bin price
- Current price: Displayed as quiet text at the top right

## Data Processing

The component calculates:

1. **Downsampling** — At most 100 bars, retaining each bucket's peak bin
2. **Max liquidity** — Highest total liquidity across displayed bars
3. **Bar values** — Each displayed bin's liquidity as percentage of max
4. **Active bin center** — The marker is centered on the displayed bucket containing the active bin

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

## See Also

- [[PositionInfo]] — Source of liquidity data
- [[Position Architecture]] — How positions relate to bins
- [[Number Formatting]] — Price display conventions
