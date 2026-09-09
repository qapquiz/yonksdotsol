'use no memo'

import type { ReactElement } from 'react'

import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget'

import { themeTokens } from '../config/theme'
import { buildLiquidityGraph } from './liquidityGraph'
import type { PositionWidgetData } from './positionWidgetData'
import { shortAddress } from './positionWidgetData'

const C = themeTokens.dark
const INSET = 16
const TOUCH_SIZE = 44

interface PositionLiquidityWidgetProps {
  position: PositionWidgetData | null
  index: number
  count: number
  width: number
  height: number
  updatedAt: number | null
  refreshing?: boolean
  message?: string
}

interface WidgetButtonProps {
  action: string
  label: string
  muted?: boolean
}

function WidgetButton({ action, label, muted = false }: WidgetButtonProps): ReactElement {
  const accessibilityLabel =
    action === 'NEXT_POSITION'
      ? 'Next position'
      : action === 'PREVIOUS_POSITION'
        ? 'Previous position'
        : 'Refresh positions'
  return (
    <FlexWidget
      clickAction={action}
      accessibilityLabel={accessibilityLabel}
      style={{ width: 64, height: TOUCH_SIZE, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}
    >
      <TextWidget text={label} style={{ fontSize: 12, color: muted ? C.textMuted : C.primary, fontWeight: '700' }} />
    </FlexWidget>
  )
}

/** Native RemoteViews only: no hooks or React Compiler memoization. */
export default function PositionLiquidityWidget({
  position,
  index,
  count,
  width,
  height,
  updatedAt,
  refreshing = false,
  message,
}: PositionLiquidityWidgetProps): ReactElement {
  const chartWidth = Math.max(120, width - INSET * 2)
  const chartHeight = Math.max(message ? 32 : 48, Math.min(160, height - 280 - (message ? 16 : 0)))
  const graph = buildLiquidityGraph(position?.liquidityShape ?? null, chartWidth, chartHeight)
  const statusColor = position?.inRange ? C.primary : C.secondary
  const pnl = position?.pnlSol
  const pnlText = pnl != null ? `${pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(4)} SOL` : '—'
  const updated =
    updatedAt != null ? new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
  const footer = refreshing ? 'Updating…' : updated ? `Updated ${updated}` : 'Open Yonks to get started'

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={
        position
          ? `${position.tokenXSymbol} / ${position.tokenYSymbol}, position ${index + 1} of ${count}, ${position.inRange ? 'in range' : 'out of range'}. Open Yonks.`
          : 'Positions. Open Yonks.'
      }
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: C.surface,
        borderRadius: 24,
        padding: INSET,
        flexDirection: 'column',
      }}
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          width: 'match_parent',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget
            text="POSITION LIQUIDITY"
            style={{ fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontWeight: '700', marginBottom: 4 }}
          />
          <TextWidget
            text={position ? `${position.tokenXSymbol} / ${position.tokenYSymbol}` : 'Your positions'}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 18, color: C.text, fontWeight: '700' }}
          />
        </FlexWidget>
        <WidgetButton action="REFRESH" label="Refresh" muted={!refreshing} />
      </FlexWidget>

      {position ? (
        <FlexWidget style={{ flex: 1, flexDirection: 'column', width: 'match_parent' }}>
          <FlexWidget
            style={{
              flexDirection: 'row',
              width: 'match_parent',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <TextWidget text={shortAddress(position.positionAddress)} style={{ fontSize: 10, color: C.textMuted }} />
            <TextWidget
              text={position.inRange ? 'IN RANGE' : 'OUT OF RANGE'}
              style={{ fontSize: 10, color: statusColor, fontWeight: '700' }}
            />
          </FlexWidget>
          <FlexWidget
            style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between', marginBottom: 8 }}
          >
            <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
              <TextWidget text="VALUE" style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }} />
              <TextWidget
                text={position.value ?? '—'}
                maxLines={1}
                style={{ fontSize: 20, color: C.text, adjustsFontSizeToFit: true }}
              />
            </FlexWidget>
            <FlexWidget style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-end' }}>
              <TextWidget text="uPnL" style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }} />
              <TextWidget
                text={pnlText}
                maxLines={1}
                style={{
                  fontSize: 14,
                  color: pnl == null ? C.textMuted : pnl >= 0 ? C.primary : C.negative,
                  adjustsFontSizeToFit: true,
                }}
              />
            </FlexWidget>
          </FlexWidget>
          <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
            <FlexWidget
              style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between', marginBottom: 4 }}
            >
              <TextWidget text="LIQUIDITY SHAPE" style={{ fontSize: 10, color: C.textMuted, letterSpacing: 1 }} />
              <TextWidget
                text={graph ? `${graph.totalBins} bins` : 'Unavailable'}
                style={{ fontSize: 10, color: C.textMuted }}
              />
            </FlexWidget>
            {graph ? (
              <SvgWidget
                svg={graph.svg}
                accessibilityLabel={`Liquidity across ${graph.totalBins} bins. ${position.inRange ? 'The dashed line marks the active bin.' : 'The active bin is outside the position range.'}`}
                style={{ width: chartWidth, height: chartHeight }}
              />
            ) : (
              <FlexWidget style={{ height: chartHeight, alignItems: 'center', justifyContent: 'center' }}>
                <TextWidget text="Liquidity data unavailable" style={{ fontSize: 12, color: C.textMuted }} />
              </FlexWidget>
            )}
            <FlexWidget
              style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between', marginTop: 4 }}
            >
              <TextWidget text={graph?.minPrice ?? '—'} style={{ fontSize: 10, color: C.textSecondary }} />
              <FlexWidget style={{ flex: 1, alignItems: 'center' }}>
                <TextWidget
                  text={`${position.tokenYSymbol} per ${position.tokenXSymbol}`}
                  maxLines={1}
                  truncate="END"
                  style={{ fontSize: 9, color: C.textMuted, textAlign: 'center' }}
                />
              </FlexWidget>
              <TextWidget text={graph?.maxPrice ?? '—'} style={{ fontSize: 10, color: C.textSecondary }} />
            </FlexWidget>
            <TextWidget
              text={position.inRange ? 'Dashed line: active bin' : 'Active bin is outside this range'}
              style={{ fontSize: 9, color: statusColor, marginTop: 4 }}
            />
          </FlexWidget>
          <FlexWidget
            style={{
              flexDirection: 'row',
              width: 'match_parent',
              justifyContent: 'space-between',
              borderTopWidth: 1,
              borderTopColor: C.border,
              paddingTop: 8,
              marginTop: 8,
            }}
          >
            <TextWidget text="UNREALIZED FEES" style={{ fontSize: 10, color: C.textMuted }} />
            <TextWidget text={position.unrealizedFees ?? '—'} style={{ fontSize: 12, color: C.text }} />
          </FlexWidget>
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <TextWidget
            text={message ?? 'Loading positions…'}
            style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center' }}
          />
        </FlexWidget>
      )}

      {message && position && <TextWidget text={message} style={{ fontSize: 10, color: C.secondary, marginTop: 4 }} />}
      <FlexWidget
        style={{
          flexDirection: 'row',
          width: 'match_parent',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 4,
        }}
      >
        {count > 1 && <WidgetButton action="PREVIOUS_POSITION" label="‹ Prev" />}
        <FlexWidget style={{ flex: 1, alignItems: 'center' }}>
          {count > 0 && (
            <TextWidget text={`${index + 1} / ${count}`} style={{ fontSize: 11, color: C.textSecondary }} />
          )}
          <TextWidget text={footer} style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }} />
        </FlexWidget>
        {count > 1 && <WidgetButton action="NEXT_POSITION" label="Next ›" />}
      </FlexWidget>
    </FlexWidget>
  )
}
