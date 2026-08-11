import { memo } from 'react'
import { Text, View } from 'react-native'
import type { ResolvedPosition } from '../../services/positionPipeline'
import { useSettingsStore } from '../../stores/settingsStore'
import { usePixelFont } from '../../hooks/useFontConfig'
import { formatForegoneRateSolPerHour, formatForegoneRateUsdPerHour } from '../../utils/positions/formatters'
import type { TriageItem, TriageResult } from '../../utils/positions/triage'
import { TokenIcons } from '../ui/TokenIcons'

interface TriageViewProps {
  triage: TriageResult
  positions: ResolvedPosition[]
  solUsdPrice: number | null
  velocityLoading: boolean
}

function formatHours(h: number | null): string {
  if (h == null || !Number.isFinite(h)) return ''
  if (h < 1) return `${Math.round(h * 60)}m to edge`
  if (h < 24) return `${h.toFixed(1)}h to edge`
  return `${Math.round(h / 24)}d to edge`
}

function TriageRow({
  item,
  position,
  solUsdPrice,
}: {
  item: TriageItem
  position: ResolvedPosition | undefined
  solUsdPrice: number | null
}) {
  const pixelFont = usePixelFont()
  const displayCurrency = useSettingsStore((s) => s.displayCurrency)
  const isBleeding = item.tier === 'bleeding'
  const valueClass = isBleeding ? 'text-app-negative' : 'text-app-secondary'

  const value = isBleeding
    ? displayCurrency === 'SOL'
      ? formatForegoneRateSolPerHour(item.foregoneUsdPerHour, solUsdPrice)
      : formatForegoneRateUsdPerHour(item.foregoneUsdPerHour)
    : formatHours(item.timeToEdgeHours) || 'Near edge'

  return (
    <View className="flex-row items-center justify-between py-2.5">
      <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
        <TokenIcons tokenXInfo={position?.tokenXInfo ?? null} tokenYInfo={position?.tokenYInfo ?? null} />
        <Text className="text-app-text font-sans-bold text-sm" numberOfLines={1}>
          {position?.tokenXInfo?.symbol} / {position?.tokenYInfo?.symbol}
        </Text>
      </View>
      <Text className={`${valueClass} text-sm`} style={{ fontFamily: pixelFont }}>
        {value}
      </Text>
    </View>
  )
}

/**
 * Triage-mode fold: an instrument-scale urgency hero ("$X/hr not earning") over
 * a two-tier queue — "Bleeding now" (out-of-range, by foregone rate desc) then
 * "About to bleed" (near-edge, by time-to-edge asc). Colors carry the state:
 * bleeding → app-negative (loss), near-edge → app-secondary (caution).
 *
 * Queue items are display-only in Phase A (tap-to-scroll is deferred).
 */
function TriageViewComponent({ triage, positions, solUsdPrice, velocityLoading }: TriageViewProps) {
  const pixelFont = usePixelFont()
  const displayCurrency = useSettingsStore((s) => s.displayCurrency)
  const byId = new Map(positions.map((p) => [p.id, p]))

  const bleeding = triage.items.filter((i) => i.tier === 'bleeding')
  const nearEdge = triage.items.filter((i) => i.tier === 'near-edge')

  const heroText =
    displayCurrency === 'SOL'
      ? formatForegoneRateSolPerHour(triage.totalForegoneUsdPerHour, solUsdPrice)
      : formatForegoneRateUsdPerHour(triage.totalForegoneUsdPerHour)

  return (
    <View className="pt-3 pb-4 mb-2">
      {/* HERO — urgency rate */}
      <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider mb-2">
        {triage.items.length} {triage.items.length === 1 ? 'POSITION' : 'POSITIONS'} NEED ATTENTION
      </Text>
      <Text className="text-4xl text-app-negative" style={{ fontFamily: pixelFont }}>
        {heroText}
      </Text>
      <Text className="text-app-negative opacity-70 text-xs font-sans-bold mb-4">Not earning fees</Text>

      {/* TIER 1 — Bleeding now */}
      {bleeding.length > 0 && (
        <View className="mb-3">
          <Text className="text-app-negative text-[10px] font-sans-bold tracking-wider mb-1">BLEEDING NOW</Text>
          {bleeding.map((item) => (
            <TriageRow
              key={item.positionId}
              item={item}
              position={byId.get(item.positionId)}
              solUsdPrice={solUsdPrice}
            />
          ))}
        </View>
      )}

      {/* TIER 2 — About to bleed */}
      {nearEdge.length > 0 && (
        <View>
          <Text className="text-app-secondary text-[10px] font-sans-bold tracking-wider mb-1">
            ABOUT TO BLEED{velocityLoading ? '  ···' : ''}
          </Text>
          {nearEdge.map((item) => (
            <TriageRow
              key={item.positionId}
              item={item}
              position={byId.get(item.positionId)}
              solUsdPrice={solUsdPrice}
            />
          ))}
        </View>
      )}
    </View>
  )
}

export const TriageView = memo(TriageViewComponent)
