# Theme Guide

Visual design system for the Yonks app. Follow these rules to maintain consistency and avoid contrast issues.

## Color Tokens

Defined in `src/global.css` under `@theme { ... }`.

| Token                   | Hex       | Role                                            | Visible Against        |
| ----------------------- | --------- | ----------------------------------------------- | ---------------------- |
| `app-bg`                | `#050505` | Screen background (SafeAreaView)                | —                      |
| `app-surface`           | `#111111` | Card backgrounds                                | `app-bg` ✓             |
| `app-surface-highlight` | `#1a1a1a` | Subtle fills, badge backgrounds, hover states   | `app-surface` marginal |
| `app-border`            | `#222222` | Borders, dividers, **skeleton blocks**          | `app-surface` ✓        |
| `app-primary`           | `#8FA893` | Brand accent (sage green)                       | `app-surface` ✓✓       |
| `app-primary-dim`       | `#2a332c` | Tinted backgrounds (avatar ring when connected) | `app-surface` ✓        |
| `app-primary-dark`      | `#3e4f43` | Dark accent variant                             | `app-surface` ✓        |
| `app-secondary`         | `#d4955f` | Secondary accent (warm orange)                  | `app-surface` ✓✓       |
| `app-secondary-dim`     | `#332619` | Secondary tinted backgrounds                    | `app-surface` ✓        |
| `app-text`              | `#ffffff` | Primary text                                    | `app-surface` ✓✓✓      |
| `app-text-secondary`    | `#999999` | Secondary labels                                | `app-surface` ✓✓       |
| `app-text-muted`        | `#555555` | Section headers, captions, dimmed text          | `app-surface` ✓        |

## Usage Rules

### DO

- Use semantic tokens for everything: `bg-app-surface`, `text-app-text`, `border-app-border`
- Card pattern: `className="bg-app-surface rounded-3xl p-5 mb-4 border border-app-border"`
- Skeleton blocks: `bg-app-border` — has good contrast against `app-surface` (`#111111`)
- Inline styles (PixelAvatar, RefreshControl, Ionicons) use raw hex that matches theme tokens

### DO NOT

- **Never use `bg-app-surface-highlight` for skeleton blocks** — `#1a1a1a` is only +15 from `#111111`, nearly invisible
- **Never use raw `zinc-*` classes** — use semantic tokens instead
- **Never use `bg-app-primary` for full-card overlay shimmer** — tints everything including static text
- **Never mix inline `style` and `className` for the same property** — inline wins

## Skeleton Loading

Both `PortfolioSummary` and `PositionCardSkeleton` follow these rules:

1. **Card background is identical** to loaded state — `bg-app-surface` with no overlay
2. **Shimmer is per-block only** — use `<ShimmerBlock>` from `src/components/ui/ShimmerBlock.tsx`
3. **Placeholder blocks use `bg-app-border`** (`#222222`) — good contrast against card
4. **Static text stays static** — labels like "PORTFOLIO SUMMARY" do NOT shimmer
5. **ShimmerBlock opacity range**: `0.4` to `0.7` (configured in ShimmerBlock component)

### Structural Match

Skeletons must match the real component's layout so there's no layout shift when data loads:

- Header section: avatar circle + token name + value + range badge
- Chart section: wrapper div + title + 120px chart area + price labels + legend
- Footer section: two fee blocks (unrealized + claimed)

## What Cannot Be Themed

These use inline styles or native props that Uniwind cannot process:

- `SafeAreaView` background: `style={{ backgroundColor: '#050505' }}`
- `RefreshControl` tint: `tintColor="#8FA893"`
- `Ionicons` color: `color="#8FA893"`
- `PixelAvatar` pixel colors: inline `style={{ backgroundColor: ... }}`

These raw hex values intentionally match their theme token equivalents.

## Chart Colors

Bar colors in `LiquidityBarChart` use extracted constants (not theme tokens, since they render in SVG):

| Constant            | Color                | Purpose                |
| ------------------- | -------------------- | ---------------------- |
| `BAR_COLOR_DEFAULT` | `#3f3f46` (zinc-700) | Above/below active bin |
| `BAR_COLOR_ACTIVE`  | `#22d3ee` (cyan-400) | Active bin marker      |
| Grid stroke         | `#222222`            | Matches `app-border`   |

## Semantic Color Patterns

| UI Element             | Token                   | Example                                                    |
| ---------------------- | ----------------------- | ---------------------------------------------------------- |
| Screen background      | `app-bg`                | SafeAreaView                                               |
| Card background        | `app-surface`           | `bg-app-surface rounded-3xl`                               |
| Card border            | `app-border`            | `border border-app-border`                                 |
| Badge background       | `app-surface-highlight` | `bg-app-surface-highlight rounded-full`                    |
| Section header text    | `app-text-muted`        | `text-app-text-muted text-[10px] font-bold tracking-wider` |
| Primary value text     | `app-text`              | `text-app-text text-sm font-bold`                          |
| Secondary label        | `app-text-secondary`    | `text-app-text-secondary text-xs`                          |
| Positive PnL           | `emerald-400`           | `text-emerald-400`                                         |
| Negative PnL           | `red-400`               | `text-red-400`                                             |
| Warning (out of range) | `orange-400/500`        | `text-orange-400`                                          |
| Connected indicator    | `app-primary`           | `bg-app-primary-dim border-app-primary`                    |
| Disconnected indicator | `app-surface-highlight` | `bg-app-surface-highlight`                                 |
