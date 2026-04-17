---
title: PositionInfo
type: entity
location: "@meteora-ag/dlmm"
created: 2026-04-18
updated: 2026-04-18
tags: [meteora, dlmm, positions, data-model]
related:
  - Position Architecture
  - Connection
  - CacheManager
---

# PositionInfo

Primary data structure for Meteora DLMM positions.

## Location

From `@meteora-ag/dlmm` package

## Structure

```typescript
PositionInfo {
  publicKey: PublicKey              // The LB pair address (NOT position address)
  tokenX: { mint: { address: PublicKey } }
  tokenY: { mint: { address: PublicKey } }
  lbPair: {
    activeId: BN                    // Current active bin ID
  }
  lbPairPositionsData: Array<{      // ⚠️ MULTIPLE positions per pair!
    publicKey: PublicKey             // Individual position address
    positionData: PositionData {
      lowerBinId: number
      upperBinId: number
      totalXAmount: BN
      totalYAmount: BN
      positionBinData: PositionBinData[]
      // ... fee amounts, etc.
    }
  }>
}
```

## Key Relationships

| Concept | How to Calculate | Common Mistake |
|---------|------------------|----------------|
| **Pair count** | `positionsArray.length` | Don't use as position count |
| **Position count** | `positions.reduce((s, p) => s + p.lbPairPositionsData.length, 0)` | `positions.length` only counts pairs |
| **In-range check** | `calculateIsInRange(activeId, lowerBinId, upperBinId)` | Must check per lbPosition |
| **Position address** | `lbPosition.publicKey.toBase58()` | NOT `position.publicKey` |

## Critical Insight: One Pair → Many Positions

A single trading pair (e.g., SOL/USDC) can have multiple open positions. Each position has its own bin range, amounts, and fees.

```
Map<string, PositionInfo>         // keyed by pair address
  └── PositionInfo
        ├── tokenX, tokenY        // shared across all positions on this pair
        └── lbPairPositionsData[] // one entry per position
              ├── Position 1      // renders as PositionCard
              ├── Position 2      // renders as PositionCard
              └── Position N      // renders as PositionCard
```

## See Also

- [[Position Architecture]] — Deeper dive into position structure
- [[Connection]] — Positions fetched via Connection
- [[CacheManager]] — Positions cached with TTL
