'use no memo'

import React from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'
import type { ColorProp } from 'react-native-android-widget'

interface PortfolioWidgetProps {
  mode: 'light' | 'dark'
  totalPnlSol: number
  totalPnlPercent: number
  totalValueSol: number
  totalUnclaimedFeesSol: number
  positionCount: number
  lastUpdated: string
}

interface Palette {
  background: ColorProp
  border: ColorProp
  textPrimary: ColorProp
  textSecondary: ColorProp
  textMuted: ColorProp
  badgeBg: ColorProp
  profit: ColorProp
  loss: ColorProp
}

function paletteFor(mode: 'light' | 'dark'): Palette {
  if (mode === 'dark') {
    return {
      background: '#151515',
      border: '#333333',
      textPrimary: '#ffffff',
      textSecondary: '#aaaaaa',
      textMuted: '#777777',
      badgeBg: '#252525',
      profit: '#34d399',
      loss: '#f87171',
    }
  }
  return {
    background: '#ffffff',
    border: '#e0e0e0',
    textPrimary: '#1a1a1a',
    textSecondary: '#666666',
    textMuted: '#999999',
    badgeBg: '#eeeeee',
    profit: '#059669',
    loss: '#dc2626',
  }
}

function formatSol(value: number): string {
  if (!Number.isFinite(value)) return '0.00'
  if (Math.abs(value) < 0.01) return '0.00'
  if (Math.abs(value) >= 1000) return Math.abs(value).toFixed(2)
  return Math.abs(value).toFixed(4)
}

export function PortfolioWidget({
  mode,
  totalPnlSol,
  totalPnlPercent,
  totalValueSol,
  totalUnclaimedFeesSol,
  positionCount,
  lastUpdated,
}: PortfolioWidgetProps) {
  const p = paletteFor(mode)
  const isProfit = totalPnlSol >= 0
  const pnlColor = isProfit ? p.profit : p.loss
  const sign = isProfit ? '+' : '-'

  const pnlText = `${sign}${formatSol(totalPnlSol)}`
  const pnlPercentText = `${sign}${isNaN(totalPnlPercent) ? '0.00' : Math.abs(totalPnlPercent).toFixed(2)}%`

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: p.background,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: p.border,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
    >
      {/* Left: Label + count */}
      <FlexWidget
        style={{
          alignItems: 'center',
          flexGap: 4,
        }}
      >
        <TextWidget
          text="PNL"
          style={{
            fontSize: 9,
            fontFamily: 'Geist-Bold',
            color: p.textMuted,
            letterSpacing: 1,
          }}
        />
        <FlexWidget
          style={{
            backgroundColor: p.badgeBg,
            borderRadius: 8,
            paddingHorizontal: 5,
            paddingVertical: 1,
          }}
        >
          <TextWidget
            text={`${positionCount}`}
            style={{
              fontSize: 9,
              fontFamily: 'Geist-Bold',
              color: p.textSecondary,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Center: PnL SOL + % */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          flexGap: 4,
        }}
      >
        <TextWidget
          text={pnlText}
          style={{
            fontSize: 20,
            fontFamily: 'GeistPixel-Square',
            color: pnlColor,
            adjustsFontSizeToFit: true,
          }}
        />
        <TextWidget
          text="SOL"
          style={{
            fontSize: 9,
            fontFamily: 'GeistPixel-Square',
            color: pnlColor,
            marginBottom: 2,
          }}
        />
        <TextWidget
          text={pnlPercentText}
          style={{
            fontSize: 11,
            fontFamily: 'GeistPixel-Square',
            color: pnlColor,
            marginBottom: 1,
          }}
        />
      </FlexWidget>

      {/* Right: Value + fees */}
      <FlexWidget
        style={{
          alignItems: 'flex-end',
          flexGap: 2,
        }}
      >
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            flexGap: 2,
          }}
        >
          <TextWidget
            text={formatSol(totalValueSol)}
            style={{
              fontSize: 12,
              fontFamily: 'GeistPixel-Square',
              color: p.textPrimary,
            }}
          />
          <TextWidget
            text="VAL"
            style={{
              fontSize: 8,
              fontFamily: 'Geist-Bold',
              color: p.textMuted,
            }}
          />
        </FlexWidget>
        <TextWidget
          text={lastUpdated}
          style={{
            fontSize: 8,
            fontFamily: 'Geist-Regular',
            color: p.textMuted,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  )
}
