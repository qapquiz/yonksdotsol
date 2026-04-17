# Number Formatting

Conventions for displaying numeric values throughout the app. Follow these to avoid repeated "how many decimals?" debates.

## SOL Values

### Portfolio Summary Card

Uses the `SolValue` component in `PortfolioSummary.tsx`:

| Value Range                 | Format                                  | Example             |
| --------------------------- | --------------------------------------- | ------------------- |
| ≥ 0.01                      | `toFixed(4)`                            | `12.3400`, `0.0512` |
| < 0.01 (many leading zeros) | `0.00` + subscript + significant digits | `0.00₄1234`         |
| Exactly 0                   | `0.0000`                                | `0.0000`            |

**Subscript rules:**

- Only used when `toFixed(4)` would show `0.0000` (i.e., 4+ leading zeros)
- Subscript number = leading zeros minus 2
- Always show 4 significant digits after subscript, zero-padded
- "SOL" label is smaller (`text-[10px]`) and dimmed (`opacity-60`)

### Position Card Detail

Uses `formatTokenAmount()` from `src/utils/positions/formatters.ts`:

- BigInt division: `10n ** BigInt(decimals)`
- Shows up to 6 decimal places, trailing zeros trimmed
- Example: `1.5`, `0.000042`

## USD Values

Uses `toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`:

- Always 2 decimal places
- Comma-separated thousands
- Example: `$1,234.56`, `$0.00`

## Percentages

- Always 2 decimal places with `%` suffix
- Positive prefix `+`, negative already has `-`
- Color: `text-emerald-400` for positive, `text-red-400` for negative
- Example: `+12.34%`, `-5.67%`

## Fee Display

| Context              | Style                      | Reason                           |
| -------------------- | -------------------------- | -------------------------------- |
| Portfolio summary    | White text, no `+` prefix  | Fees are collectible, not gains  |
| Position card footer | Label + value per fee type | Show both unrealized and claimed |

Fees are always ≥ 0. Don't use profit/loss coloring for fee amounts.

## Price Display

- `calculateCurrentPrice()` returns `$X.XXXX` (2-4 significant decimals)
- Uses ratio: `tokenX.price_per_token / tokenY.price_per_token`
- Price range in chart: `.toPrecision(6)` for bounds, `.toPrecision(5)` for ticks

## Common Mistakes

| ❌ Wrong                      | ✅ Right                                  | Why                                   |
| ----------------------------- | ----------------------------------------- | ------------------------------------- |
| `value.toFixed(2)` in summary | `toFixed(4)` or `SolValue`                | Loses precision for small SOL amounts |
| `+0.0001 SOL` for fees        | `0.0001 SOL` (no +)                       | Fees aren't gains                     |
| Green/red for fee amounts     | White/neutral                             | Avoid implying gain/loss              |
| Varying decimal places        | Fixed 4 in summary                        | Easier to scan and compare            |
| `.toString()` for BigInt      | `BigInt(value) / 10n ** BigInt(decimals)` | Precision loss                        |
