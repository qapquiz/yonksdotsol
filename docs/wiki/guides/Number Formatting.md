---
title: Number Formatting
type: guide
created: 2026-04-18
updated: 2026-04-18
tags: [formatting, numbers, ui]
related:
  - PositionInfo
---

# Number Formatting

Formatting conventions for SOL, USD, percentages, and fees.

## SOL Amounts

```typescript
// Large amounts: use compact notation
formatSol(1234567.89) // "1.23M"
formatSol(1234.56) // "1.23K"
formatSol(1.23456) // "1.23"
```

## USD Amounts

```typescript
// Standard USD formatting
formatUsd(1234.56) // "$1,234.56"
formatUsd(0.12) // "$0.12"
```

## Percentages

```typescript
// Percentage with sign
formatPercent(0.1234) // "+12.34%"
formatPercent(-0.0567) // "-5.67%"
```

## Fees

```typescript
// Fee amounts (basis points)
formatFee(25) // "0.25%"
```

## Formatting Utilities

Located in `src/utils/positions/formatters.ts`:

- `formatSol(amount)`
- `formatUsd(amount)`
- `formatPercent(decimal)`
- `formatFee(bps)`

## See Also

- [[PositionInfo]] — Fee data in positions
