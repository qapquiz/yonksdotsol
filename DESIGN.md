# Design System

The visual design system for the Yonks app. This is the **source of truth** for color, typography, spacing, and component styling. The token values live in [`src/config/theme.ts`](src/config/theme.ts) (the canonical hex values) and are mirrored as Uniwind CSS variables in [`src/global.css`](src/global.css) — keep both in sync.

> **Relationship to other docs:** This is the visual-design companion to [`UBIQUITOUS_LANGUAGE.md`](UBIQUITOUS_LANGUAGE.md) (domain vocabulary). The wiki's [`[[Theming]]`](docs/wiki/concepts/Theming.md) concept page and `docs/raw/theme-guide.md` are historical; this file supersedes them. When they disagree, **DESIGN.md wins**.

---

## Identity

Yonks is a Solana DLMM positions tracker. The design is **earthy and instrument-like**, not the usual neon-on-black crypto aesthetic. Two accents do all the work:

- **Sage** (`#8FA893` / `#6b8f71`) — the primary. It means _good_: profit, in-range, accruing, connected, selected.
- **Copper** (`#d4955f` / `#c07a3e`) — the secondary. It means _attention_: out-of-range, caution, claimed fees.

A single **clay-red** (`#c97064` / `#b55044`) — `negative` — is the only non-accent hue, reserved for loss and error. Everything else is neutral grayscale. Numerics use a pixel/mono typeface, giving values a readout/instrument quality. Dark mode is the default and the more considered of the two themes.

---

## Color Tokens

Every color is a token. Never use raw Tailwind palette classes (`emerald-400`, `zinc-700`, `red-400`, etc.) in components — see [Conventions](#conventions).

### Dark (default)

| Token                   | Hex       | Role                                                            |
| ----------------------- | --------- | --------------------------------------------------------------- |
| `app-bg`                | `#050505` | Screen background (`SafeAreaView`)                              |
| `app-surface`           | `#151515` | Card backgrounds                                                |
| `app-surface-highlight` | `#252525` | Recessed fills, icon-button backgrounds, sheet handle           |
| `app-border`            | `#333333` | Borders, dividers, **skeleton blocks**, chart grid derivation   |
| `app-primary`           | `#8FA893` | Sage — profit, in-range, selected, connected, price line        |
| `app-primary-dim`       | `#2a332c` | Sage tint — selected segment, in-range badge bg, avatar ring    |
| `app-primary-dark`      | `#3e4f43` | Darker sage variant (reserved)                                  |
| `app-secondary`         | `#d4955f` | Copper — out-of-range, caution, claimed fees, "below price" bar |
| `app-secondary-dim`     | `#332619` | Copper tint — out-of-range badge bg                             |
| `app-negative`          | `#c97064` | Clay-red — loss, error                                          |
| `app-negative-dim`      | `#3a2222` | Clay-red tint — reserved for badge backgrounds                  |
| `app-text`              | `#ffffff` | Primary text                                                    |
| `app-text-secondary`    | `#aaaaaa` | Secondary labels, chip text                                     |
| `app-text-muted`        | `#777777` | Eyebrows, captions, muted text, "above price" legend            |

### Light

| Token                   | Hex       | Role                               |
| ----------------------- | --------- | ---------------------------------- |
| `app-bg`                | `#f5f5f5` | Screen background                  |
| `app-surface`           | `#ffffff` | Card backgrounds                   |
| `app-surface-highlight` | `#eeeeee` | Recessed fills, icon buttons       |
| `app-border`            | `#e0e0e0` | Borders, dividers, skeleton blocks |
| `app-primary`           | `#6b8f71` | Sage (accent)                      |
| `app-primary-dim`       | `#dce8de` | Sage tint                          |
| `app-primary-dark`      | `#a3c4a8` | Sage variant                       |
| `app-secondary`         | `#c07a3e` | Copper (accent)                    |
| `app-secondary-dim`     | `#f5e6d5` | Copper tint                        |
| `app-negative`          | `#b55044` | Clay-red (loss/error)              |
| `app-negative-dim`      | `#f5ddd8` | Clay-red tint                      |
| `app-text`              | `#1a1a1a` | Primary text                       |
| `app-text-secondary`    | `#666666` | Secondary labels                   |
| `app-text-muted`        | `#999999` | Eyebrows, captions                 |

---

## Semantic Color Mapping

This is the core convention. State colors are **mapped onto the accent palette**, so profit/loss/caution theme correctly and never feel like a separate design language bolted on.

| State / meaning                | Token                                     | Example                                       |
| ------------------------------ | ----------------------------------------- | --------------------------------------------- |
| Profit, in-range, accruing     | `app-primary`                             | PnL ≥ 0, "IN RANGE" badge, unrealized fees ✨ |
| Loss, error                    | `app-negative`                            | PnL < 0, denied-permission text               |
| Out-of-range, caution, claimed | `app-secondary`                           | "OUT OF RANGE" badge, claimed fees 💰, banner |
| Selected / active control      | `app-primary-dim` bg + `app-primary` text | Segmented control, font picker                |
| Neutral recessed               | `app-surface-highlight`                   | Icon buttons, count badge bg                  |

**Badge background rule:** pair a `-dim` background with the matching accent text. This replaces the old raw-`/20`-alpha hacks (`bg-emerald-500/20`) which didn't theme.

---

## Typography

Four font roles, all configured in `src/global.css` under `@theme`. The pixel font is the only one user-configurable at runtime.

| Role          | Family / class                              | Used for                                                |
| ------------- | ------------------------------------------- | ------------------------------------------------------- |
| **Sans**      | `font-sans` (Geist-Regular)                 | Default body / UI text                                  |
| **Sans Bold** | `font-sans-bold` (Geist-Bold)               | **All** bold weight — labels, eyebrows, headings        |
| **Pixel**     | `usePixelFont()` → `style={{ fontFamily }}` | Numbers, values, SOL amounts, PnL                       |
| **Mono**      | `font-mono` (DepartureMono-Regular)         | Chart axis labels, price chips — tabular reference data |

### Rules

- **Never use `font-bold`.** It renders faux-bold on Geist-Regular. Use `font-sans-bold` (the real Bold cut). This is enforced; the codebase has zero `font-bold`.
- **Pixel font goes through `usePixelFont()`**, not a class — it's user-configurable (Geist Pixel ↔ Departure Mono) and resolved via context.
- **Mono is for tabular reference data only** (chart axis labels, range endpoints, price chips), never for primary values.
- **One eyebrow style:** `text-app-text-muted text-[10px] font-sans-bold tracking-wider`. Section headers ("PORTFOLIO SUMMARY", "LIQUIDITY SHAPE", "VALUE") all use this. (Charts previously used `font-bold tracking-widest` — unified.)

### Type scale in use

| Role            | Class                                       | Where                                  |
| --------------- | ------------------------------------------- | -------------------------------------- |
| Hero value      | `text-2xl` + pixel                          | Portfolio total PnL                    |
| Pair / card val | `text-lg` (sans-bold / pixel)               | Position header pair name, total value |
| Body value      | `text-sm`                                   | Stat columns, footer values            |
| Body            | `text-xs` / `text-base`                     | Secondary text, descriptions           |
| Eyebrow         | `text-[10px] font-sans-bold tracking-wider` | Section labels                         |

---

## Spacing

Built on Uniwind's 4px base scale. These tiers are fixed — new surfaces pick the matching tier rather than inventing a value.

| Tier                  | Value                       | Used for                                                            |
| --------------------- | --------------------------- | ------------------------------------------------------------------- |
| **Screen gutter**     | `px-4` (16)                 | Header, list `contentContainerStyle.paddingHorizontal`              |
| **Card**              | `p-5` (20)                  | All `rounded-3xl` cards (PortfolioSummary, PositionCard, skeletons) |
| **Chart inset panel** | `p-4` (16)                  | `bg-app-bg/50 rounded-xl` chart wrappers (via `ChartPanel`)         |
| **Bottom sheet**      | `px-5 pt-4 pb-8`            | SettingsSheet, FontPicker                                           |
| **Icon button**       | `h-10 w-10 rounded-full`    | Header actions (settings, font, theme, wallet)                      |
| **Segmented control** | track `p-1`, items `py-1.5` | `SegmentedControl` (both toggles)                                   |
| **Price chip**        | `px-2 py-1 rounded-md`      | `ChartPanel` price readout                                          |
| **Status badge**      | `px-2 py-1 rounded-md`      | In-range / out-of-range badge                                       |

**Card spacing rhythm:** cards stack with `mb-4`; inside a card, blocks separate with `mb-4` (sections) and `mb-1`/`mb-1.5` (label-to-value).

---

## Component Patterns

The shared primitives. Use these instead of re-rolling the markup.

### Cards

```tsx
<View className="bg-app-surface rounded-3xl p-5 mb-4 border border-app-border">
```

Used for every **position** surface — `PositionCard` and its skeleton. (The portfolio hero is **not** a card — see below.)

### Portfolio hero — card-less readout (signature)

The portfolio summary (`PortfolioSummary.tsx`) is the **hero**: the **PnL delta** sits **bare on the background** at instrument scale (`text-4xl` pixel, colored sage for profit / clay-red for loss), with total value as the neutral anchor line beneath, and a quiet stat row anchored by a hairline. No card chrome. This is deliberate — the bare treatment distinguishes "the portfolio" from the boxed position cards, and trusts the pixel type + palette to carry the most important number without a container. **PnL leads** (it's the emotion, in color); total value is the stable anchor beneath. Its skeleton (`PortfolioSummarySkeleton`) is also card-less to match.

### ChartPanel — chart header + body

`src/components/positions/ChartPanel.tsx`. Renders the chart **directly on the card surface** — eyebrow title (left) + current price as quiet mono reference text (right), then the chart body as children. **No nested container.** (It previously wrapped the chart in a recessed `bg-app-bg/50` panel, creating a box-in-a-box inside the card.)

```tsx
<ChartPanel title="LIQUIDITY SHAPE" currentPrice={price}>
  {/* chart body + axis labels + legend as children */}
</ChartPanel>
```

### PositionFooter — fee rows

Label-left / value-right rows, separated from the chart by a hairline. **State is carried by color, not emoji**: unrealized (accruing) → `app-primary` (sage), claimed → `app-secondary` (copper). Sub-values (e.g. USD conversions) sit under each value, right-aligned. No `✨`/`💰`/`📊` emoji anywhere — they read as generic-crypto and clash with the instrument identity.

````

### SegmentedControl — toggles

`src/components/ui/SegmentedControl.tsx`. The **single source** for segmented toggles. Both the chart-mode and SOL/USD currency controls render through it, so their padding rhythm, radius, and selected/unselected colors can't drift.

```tsx
<SegmentedControl
  options={[
    { value: 'liquidity', label: 'Liquidity' },
    { value: 'price', label: 'Price' },
  ]}
  value={chartMode}
  onChange={setChartMode}
  variant="fill" // 'fill' = items grow equally (full width); 'inline' = fit content
  className="mb-3"
/>
````

**Shared rhythm:** recessed `bg-app-bg/50 p-1 rounded-lg` track + `py-1.5 rounded-md` items + `bg-app-primary-dim` / `text-app-primary` selected state.

### Skeletons

Per-block shimmer via [`ShimmerBlock`](src/components/ui/ShimmerBlock.tsx) — the **only** shimmer implementation (a duplicate was removed from `PositionCardSkeleton`). Rules:

- Card background identical to loaded state (`bg-app-surface`, no overlay).
- Shimmer is per-block; placeholder blocks use `bg-app-border` (good contrast against surface).
- Static labels stay static — don't shimmer eyebrows.
- Skeleton layout must match the real component to avoid shift on load.

---

## Charts

Charts render in SVG, so colors can't use Uniwind classes — they read tokens via `useThemeTokens()` and derive SVG-compatible strings. This replaced hardcoded cyan/emerald/zinc constants.

**Liquidity bar chart:**

| Bar          | Derivation                  |
| ------------ | --------------------------- |
| Active bin   | `tokens.primary` (sage)     |
| Below active | `tokens.secondary` (copper) |
| Above active | `tokens.border` (neutral)   |
| Grid lines   | `tokens.border` + alpha     |

**Price line chart:**

| Element         | Derivation                           |
| --------------- | ------------------------------------ |
| Price line      | `tokens.primary`                     |
| Range band fill | `tokens.primary` + low alpha (≈0.12) |
| Range band edge | `tokens.primary` + mid alpha (≈0.5)  |
| Grid lines      | `tokens.border` + alpha (≈0.3)       |

**Alpha convention:** append an 8-digit hex suffix to the 6-digit token (`${tokens.primary}1F`). `1F`≈0.12, `4D`≈0.3, `80`≈0.5.

**Legend swatches** use Uniwind classes (`bg-app-primary`, `bg-app-secondary`), so they stay in sync with the bars automatically.

---

## Conventions

### DO

- Use semantic tokens everywhere: `bg-app-surface`, `text-app-text`, `border-app-border`.
- Map state colors through the [semantic mapping](#semantic-color-mapping): profit→primary, loss→negative, caution→secondary.
- Use `font-sans-bold` for all bold; `usePixelFont()` for numerics.
- Reuse the shared primitives (`ChartPanel`, `SegmentedControl`, `ShimmerBlock`).
- Keep `theme.ts` and `global.css` in sync when changing a value.

### DON'T

- **Never use raw Tailwind palette classes** (`emerald-*`, `red-*`, `orange-*`, `amber-*`, `cyan-*`, `zinc-*`, …). They don't theme and clash with the palette.
- **Never use `font-bold`** — use `font-sans-bold`.
- **Never hardcode hex in components.** Read from `useThemeTokens()`. (The single sanctioned exception is the dev-only banner, which is intentionally fixed dark-on-copper across both themes.)
- **Never duplicate `ShimmerBlock`** or the chart panel wrapper — import the shared one.
- **Never mix inline `style` and `className`** for the same property — inline wins.

---

## What Can't Use Tokens

A few surfaces use native props that Uniwind can't process. These read from `useThemeTokens()` and pass the token value through — **not** a restated hex literal:

- `RefreshControl` `tintColor` → `tokens.refreshTint`
- `expo-status-bar` `style` → `tokens.statusBar`
- `Ionicons` `color` → the relevant token
- `PixelAvatar` SVG fills → `tokens.primary` / `tokens.primaryDim` / etc.
- Chart SVG strokes/fills → token-derived (see [Charts](#charts))

The rule: even outside className, **the hex still comes from the token**, so a theme change updates everything.

---

## Sources of Truth

| Concern          | File                                 |
| ---------------- | ------------------------------------ |
| Token hex values | `src/config/theme.ts`                |
| Uniwind CSS vars | `src/global.css`                     |
| Font families    | `src/config/fonts.ts` + `global.css` |
| Theme state      | `src/stores/settingsStore.ts`        |
| This document    | `DESIGN.md`                          |

When in doubt, `theme.ts` is the ground truth for color and `DESIGN.md` is the ground truth for _how to use it_.
