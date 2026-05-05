'use no memo'

import type { WidgetInfo, WidgetRepresentation } from 'react-native-android-widget'
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget'
import { getStoredWalletAddress } from '../stores/walletStore'
import { createPositionPipeline } from '../services/positionPipeline'

// ─── Colors (dark theme) ─────────────────────────────────────────────

const COLORS = {
  surface: '#151515',
  surfaceHighlight: '#252525',
  textMuted: '#777777',
  textSecondary: '#aaaaaa',
  text: '#ffffff',
  primary: '#8FA893',
  profit: '#34d399',
  loss: '#f87171',
} as const

// ─── Shared types ────────────────────────────────────────────────────

export interface PortfolioSummary {
  totalPnlSol: number
  totalPnlPercent: number
  totalValueSol: number
  totalInitialDepositSol: number
  totalUnclaimedFeesSol: number
  positionCount: number
  outOfRangeCount: number
}

// ─── Number formatting ───────────────────────────────────────────────

function formatSolValue(value: number): string {
  if (!Number.isFinite(value)) return '0.0000'
  return value.toFixed(4)
}

// ─── SVG Icons ───────────────────────────────────────────────────────

const REFRESH_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${COLORS.textMuted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`

// ─── Widget components ───────────────────────────────────────────────

function PortfolioSummaryWidget({ summary, lastUpdated }: { summary: PortfolioSummary | null; lastUpdated: string }) {
  const hasData = summary !== null
  const isProfit = hasData ? summary.totalPnlSol >= 0 : true
  const pnlColor = isProfit ? COLORS.profit : COLORS.loss
  const sign = isProfit ? '+' : '-'

  const pnlSolDisplay = hasData ? formatSolValue(Math.abs(summary.totalPnlSol)) : '—'
  const pnlPctDisplay = hasData
    ? `${sign}${isNaN(summary.totalPnlPercent) ? '0.00' : summary.totalPnlPercent.toFixed(2)}%`
    : '—'
  const valueDisplay = hasData ? formatSolValue(summary.totalValueSol) : '—'
  const depositedDisplay = hasData ? formatSolValue(summary.totalInitialDepositSol) : '—'
  const feesDisplay = hasData ? formatSolValue(summary.totalUnclaimedFeesSol) : '—'
  const countDisplay = hasData ? String(summary.positionCount) : '0'

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 20,
        flexDirection: 'column',
        width: 'match_parent',
      }}
    >
      {/* Header row: title + count badge + refresh button */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginBottom: 12,
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text="PORTFOLIO SUMMARY"
            style={{
              fontSize: 10,
              color: COLORS.textMuted,
              fontWeight: '700',
              letterSpacing: 1.5,
            }}
          />
          <FlexWidget
            style={{
              backgroundColor: COLORS.surfaceHighlight,
              borderRadius: 10,
              width: 20,
              height: 20,
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 8,
            }}
          >
            <TextWidget
              text={countDisplay}
              style={{
                fontSize: 10,
                color: COLORS.textSecondary,
                fontWeight: '700',
              }}
            />
          </FlexWidget>
        </FlexWidget>
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

      {/* PnL value */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          marginBottom: 4,
        }}
      >
        {hasData && (
          <TextWidget
            text={sign}
            style={{
              fontSize: 22,
              color: pnlColor,
            }}
          />
        )}
        <TextWidget
          text={pnlSolDisplay}
          style={{
            fontSize: 22,
            color: hasData ? pnlColor : COLORS.textMuted,
          }}
        />
        <TextWidget
          text=" SOL"
          style={{
            fontSize: 12,
            color: hasData ? pnlColor : COLORS.textMuted,
          }}
        />
      </FlexWidget>

      {/* PnL percent */}
      <TextWidget
        text={pnlPctDisplay}
        style={{
          fontSize: 13,
          color: hasData ? pnlColor : COLORS.textMuted,
          marginBottom: hasData && summary.outOfRangeCount > 0 ? 8 : 16,
        }}
      />

      {/* Out-of-range warning */}
      {hasData && summary.outOfRangeCount > 0 && (
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 14,
            paddingHorizontal: 4,
          }}
        >
          <FlexWidget
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: '#f9731633',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TextWidget
              text="!"
              style={{
                fontSize: 10,
                color: '#f97316',
                fontWeight: '700',
              }}
            />
          </FlexWidget>
          <TextWidget
            text={` ${summary.outOfRangeCount} ${summary.outOfRangeCount === 1 ? 'position' : 'positions'} out of range`}
            style={{
              fontSize: 12,
              color: '#fb923c',
              fontWeight: '700',
              marginLeft: 4,
            }}
          />
        </FlexWidget>
      )}

      {/* Bottom row: Value / Deposited / Unclaimed Fees */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: 'match_parent',
        }}
      >
        {/* VALUE */}
        <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
          <TextWidget
            text="VALUE"
            style={{
              fontSize: 10,
              color: COLORS.textMuted,
              fontWeight: '700',
              letterSpacing: 1.5,
              marginBottom: 4,
            }}
          />
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <TextWidget
              text={valueDisplay}
              style={{
                fontSize: 14,
                color: COLORS.text,
              }}
            />
            <TextWidget
              text=" SOL"
              style={{
                fontSize: 10,
                color: COLORS.textMuted,
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* DEPOSITED */}
        <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
          <TextWidget
            text="DEPOSITED"
            style={{
              fontSize: 10,
              color: COLORS.textMuted,
              fontWeight: '700',
              letterSpacing: 1.5,
              marginBottom: 4,
            }}
          />
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <TextWidget
              text={depositedDisplay}
              style={{
                fontSize: 14,
                color: COLORS.text,
              }}
            />
            <TextWidget
              text=" SOL"
              style={{
                fontSize: 10,
                color: COLORS.textMuted,
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* UNCLAIMED FEES */}
        <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
          <TextWidget
            text="UNCLAIMED FEES"
            style={{
              fontSize: 10,
              color: COLORS.textMuted,
              fontWeight: '700',
              letterSpacing: 1.5,
              marginBottom: 4,
            }}
          />
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <TextWidget
              text={feesDisplay}
              style={{
                fontSize: 14,
                color: COLORS.text,
              }}
            />
            <TextWidget
              text=" SOL"
              style={{
                fontSize: 10,
                color: COLORS.textMuted,
              }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>

      {/* Last updated timestamp */}
      <TextWidget
        text={lastUpdated}
        style={{
          fontSize: 9,
          color: COLORS.textMuted,
          marginTop: 12,
        }}
      />
    </FlexWidget>
  )
}

function ErrorWidget({ message }: { message: string }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 20,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 160,
      }}
    >
      <TextWidget
        text="YONKS"
        style={{
          fontSize: 14,
          color: COLORS.primary,
          fontWeight: '700',
          letterSpacing: 2,
          marginBottom: 8,
        }}
      />
      <TextWidget
        text={message}
        style={{
          fontSize: 11,
          color: COLORS.textMuted,
          textAlign: 'center',
        }}
      />
    </FlexWidget>
  )
}

function NoPositionsWidget({ lastUpdated }: { lastUpdated: string }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 20,
        flexDirection: 'column',
        width: 'match_parent',
      }}
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginBottom: 16,
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text="PORTFOLIO SUMMARY"
            style={{
              fontSize: 10,
              color: COLORS.textMuted,
              fontWeight: '700',
              letterSpacing: 1.5,
            }}
          />
          <FlexWidget
            style={{
              backgroundColor: COLORS.surfaceHighlight,
              borderRadius: 10,
              width: 20,
              height: 20,
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 8,
            }}
          >
            <TextWidget
              text="0"
              style={{
                fontSize: 10,
                color: COLORS.textSecondary,
                fontWeight: '700',
              }}
            />
          </FlexWidget>
        </FlexWidget>
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

      <TextWidget
        text="No active positions"
        style={{
          fontSize: 14,
          color: COLORS.textMuted,
          textAlign: 'center',
          marginBottom: 16,
        }}
      />

      <TextWidget
        text={lastUpdated}
        style={{
          fontSize: 9,
          color: COLORS.textMuted,
        }}
      />
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
