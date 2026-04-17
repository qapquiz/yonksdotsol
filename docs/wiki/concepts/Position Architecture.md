---
title: Position Architecture
type: concept
created: 2026-04-18
updated: 2026-04-18
tags: [meteora, dlmm, positions, architecture]
related:
  - PositionInfo
  - Caching Strategy
---

# Position Architecture

Understanding the one-pair-to-many-positions relationship.

## Overview

In Meteora DLMM, a single trading pair can have multiple open positions. This is a common source of confusion.

## Structure

```
Map<string, PositionInfo>         // keyed by pair address
  └── PositionInfo
        ├── publicKey             // Pair address (NOT position address)
        ├── tokenX, tokenY        // Shared across all positions on this pair
        └── lbPairPositionsData[] // Multiple positions!
              ├── Position 1      // Own bin range, amounts, fees
              ├── Position 2      // Own bin range, amounts, fees
              └── Position N      // Own bin range, amounts, fees
```

## UI Rendering

The UI renders one `PositionCard` per `lbPairPositionsData` entry:

```typescript
for (const [pairAddress, position] of positionsEntries) {
  for (let idx = 0; idx < position.lbPairPositionsData.length; idx++) {
    items.push({
      type: 'position',
      id: `${position.publicKey.toString()}-${idx}`,
      position,
      lbPositionIndex: idx,
      poolAddress: pairAddress,
      // ...
    })
  }
}
```

## Common Mistakes

| Mistake | Correct |
|---------|---------|
| Using `positions.length` as position count | Use `positions.reduce((s, p) => s + p.lbPairPositionsData.length, 0)` |
| Using `position.publicKey` as position address | Use `lbPosition.publicKey` |
| Checking range per pair | Check per `lbPosition.positionData` |

## See Also

- [[PositionInfo]] — Data structure details
- [[Caching Strategy]] — Positions cached with TTL
