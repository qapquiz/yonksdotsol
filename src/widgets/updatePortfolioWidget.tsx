'use no memo'

import type { WidgetRepresentation } from 'react-native-android-widget'
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget'
import { createPositionPipeline } from '../services/positionPipeline'
import { themeTokens } from '../config/theme'

// ─── Colors ──────────────────────────────────────────────────────────
// The widget renders to native Android RemoteViews (not Uniwind), so it
// can't use classes — but it reads the SAME source of truth as the app:
// `themeTokens` (pure constants, headless-task safe). The widget is
// dark-only by design (a home-screen glanceable), so we bind `.dark`
// directly rather than threading the theme hook (unavailable headlessly).
// If a token changes in theme.ts, the widget tracks it automatically.

const C = themeTokens.dark

// ─── Shared types ────────────────────────────────────────────────────

export interface PortfolioSummary {
  totalPnlSol: number
  totalPnlPercent: number
  totalValueSol: number
  totalInitialDepositSol: number
  totalUnclaimedFeesSol: number
  positionCount: number
  outOfRangeCount: number
  feesTvl24h: number | null
}

// ─── Number formatting ───────────────────────────────────────────────

function formatSolValue(value: number): string {
  if (!Number.isFinite(value)) return '0.0000'
  return value.toFixed(4)
}

// ─── SVG Icons ───────────────────────────────────────────────────────

const REFRESH_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${C.textMuted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`

// ─── Shared header (title + refresh affordance) ──────────────────────

function WidgetHeader({ title }: { title: string }) {
  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: 'match_parent',
        marginBottom: 14,
      }}
    >
      <TextWidget
        text={title}
        style={{
          fontSize: 10,
          color: C.textMuted,
          fontWeight: '700',
          letterSpacing: 1.5,
        }}
      />
      <FlexWidget
        clickAction="REFRESH"
        style={{
          width: 32,
          height: 32,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SvgWidget svg={REFRESH_ICON_SVG} style={{ width: 18, height: 18 }} />
      </FlexWidget>
    </FlexWidget>
  )
}

/** One label/value column in the hairline stats row. */
function StatColumn({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
      <TextWidget
        text={label}
        style={{
          fontSize: 10,
          color: C.textMuted,
          fontWeight: '700',
          letterSpacing: 1.5,
          marginBottom: 4,
        }}
      />
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <TextWidget
          text={value}
          style={{
            fontSize: 14,
            color: C.text,
          }}
        />
        {unit && (
          <TextWidget
            text={` ${unit}`}
            style={{
              fontSize: 10,
              color: C.textMuted,
            }}
          />
        )}
      </FlexWidget>
    </FlexWidget>
  )
}

// ─── Widget components ───────────────────────────────────────────────

function PortfolioSummaryWidget({ summary, lastUpdated }: { summary: PortfolioSummary; lastUpdated: string }) {
  const isProfit = summary.totalPnlSol >= 0
  const pnlColor = isProfit ? C.primary : C.negative
  const sign = isProfit ? '+' : '-'

  const pnlSolDisplay = formatSolValue(Math.abs(summary.totalPnlSol))
  // Math.abs prevents double-minus: sign is '-' and toFixed() already includes '-' for negatives
  const pnlPctDisplay = `${sign}${isNaN(summary.totalPnlPercent) ? '0.00' : Math.abs(summary.totalPnlPercent).toFixed(2)}%`
  const valueDisplay = formatSolValue(summary.totalValueSol)
  const depositedDisplay = formatSolValue(summary.totalInitialDepositSol)
  const feesDisplay = formatSolValue(summary.totalUnclaimedFeesSol)
  const feesTvlDisplay = summary.feesTvl24h != null ? (summary.feesTvl24h * 100).toFixed(2) + '%' : '—'

  const titleText = `${summary.positionCount} ${summary.positionCount === 1 ? 'POSITION' : 'POSITIONS'}`

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        backgroundColor: C.surface,
        borderRadius: 24,
        padding: 20,
        flexDirection: 'column',
        width: 'match_parent',
      }}
    >
      <WidgetHeader title={titleText} />

      {/* HERO — PnL delta (colored), the glanceable answer to "how am I doing" */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 }}>
        <TextWidget text={sign} style={{ fontSize: 22, color: pnlColor }} />
        <TextWidget text={pnlSolDisplay} style={{ fontSize: 22, color: pnlColor }} />
        <TextWidget text=" SOL" style={{ fontSize: 12, color: pnlColor }} />
      </FlexWidget>

      {/* ANCHOR — total value (neutral) + pct (colored) */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          marginBottom: summary.outOfRangeCount > 0 ? 8 : 16,
        }}
      >
        <TextWidget text={valueDisplay} style={{ fontSize: 14, color: C.text }} />
        <TextWidget text=" SOL" style={{ fontSize: 10, color: C.textMuted }} />
        <TextWidget text={`  ${pnlPctDisplay}`} style={{ fontSize: 12, color: pnlColor }} />
      </FlexWidget>

      {/* Out-of-range warning — copper, mirrors the in-app banner */}
      {summary.outOfRangeCount > 0 && (
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <FlexWidget
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: C.secondaryDim,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TextWidget text="!" style={{ fontSize: 10, color: C.secondary, fontWeight: '700' }} />
          </FlexWidget>
          <TextWidget
            text={` ${summary.outOfRangeCount} ${summary.outOfRangeCount === 1 ? 'position' : 'positions'} out of range`}
            style={{ fontSize: 12, color: C.secondary, fontWeight: '700', marginLeft: 4 }}
          />
        </FlexWidget>
      )}

      {/* Stats row — hairline-anchored, value folded out (it's the anchor above) */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: 'match_parent',
          borderTopWidth: 1,
          borderTopColor: C.border,
          paddingTop: 12,
        }}
      >
        <StatColumn label="DEPOSITED" value={depositedDisplay} unit="SOL" />
        <StatColumn label="UNCLAIMED FEES" value={feesDisplay} unit="SOL" />
        <StatColumn label="24H FEES / TVL" value={feesTvlDisplay} />
      </FlexWidget>

      {/* Last updated timestamp */}
      <TextWidget text={lastUpdated} style={{ fontSize: 9, color: C.textMuted, marginTop: 12 }} />
    </FlexWidget>
  )
}

function ErrorWidget({ message }: { message: string }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        backgroundColor: C.surface,
        borderRadius: 24,
        padding: 20,
        flexDirection: 'column',
        width: 'match_parent',
      }}
    >
      <WidgetHeader title="PORTFOLIO" />

      <FlexWidget
        style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}
      >
        <TextWidget
          text="YONKS"
          style={{ fontSize: 14, color: C.primary, fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}
        />
        <TextWidget text={message} style={{ fontSize: 11, color: C.textMuted, textAlign: 'center' }} />
      </FlexWidget>
    </FlexWidget>
  )
}

function NoPositionsWidget({ lastUpdated }: { lastUpdated: string }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        backgroundColor: C.surface,
        borderRadius: 24,
        padding: 20,
        flexDirection: 'column',
        width: 'match_parent',
      }}
    >
      <WidgetHeader title="0 POSITIONS" />

      <FlexWidget
        style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}
      >
        <TextWidget text="No active positions" style={{ fontSize: 14, color: C.textMuted, textAlign: 'center' }} />
      </FlexWidget>

      <TextWidget text={lastUpdated} style={{ fontSize: 9, color: C.textMuted, marginTop: 16 }} />
    </FlexWidget>
  )
}

// ─── Data fetching (works in both headless and in-app contexts) ───────

export async function fetchPortfolioSummary(walletAddress: string): Promise<PortfolioSummary | null> {
  const pipeline = createPositionPipeline()
  const result = await pipeline.fetchPortfolioSummary(walletAddress)

  if (!result) {
    return null
  }

  return {
    totalPnlSol: result.totalPnlSol,
    totalPnlPercent: result.totalPnlPercent,
    totalValueSol: result.totalValueSol,
    totalInitialDepositSol: result.totalInitialDepositSol,
    totalUnclaimedFeesSol: result.totalUnclaimedFeesSol,
    positionCount: result.positionCount,
    outOfRangeCount: result.outOfRangeCount,
    feesTvl24h: result.feesTvl24h ?? null,
  }
}

// ─── Shared render logic ─────────────────────────────────────────────

export function buildWidgetTree(summary: PortfolioSummary | null): WidgetRepresentation {
  const lastUpdated = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (!summary || summary.positionCount === 0) {
    return <NoPositionsWidget lastUpdated={`Updated ${lastUpdated}`} />
  }

  return <PortfolioSummaryWidget summary={summary} lastUpdated={`Updated ${lastUpdated}`} />
}

export function buildErrorWidget(message: string): WidgetRepresentation {
  return <ErrorWidget message={message} />
}
