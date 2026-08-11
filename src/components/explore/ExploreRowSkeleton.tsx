import { memo } from 'react'
import { View } from 'react-native'

import { ShimmerBlock } from '../ui/ShimmerBlock'

/**
 * Loading placeholder for a single Explore pool row. Mirrors ExploreRow:
 * a title + symbol line, an APR on the right, and a 4-column stat strip
 * (TVL / 24H VOL / MKT CAP / BIN STEP) below a divider.
 */
function ExploreRowSkeletonComponent() {
  return (
    <View className="bg-app-surface rounded-2xl p-4 mb-3 border border-app-border">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1 mr-3 gap-3">
          <View className="flex-row">
            <ShimmerBlock className="w-8 h-8 rounded-full bg-app-border z-10" />
            <ShimmerBlock className="w-8 h-8 rounded-full bg-app-border -ml-3" />
          </View>
          <View className="flex-1">
            <ShimmerBlock className="h-4 bg-app-border rounded w-32 mb-1.5" />
            <ShimmerBlock className="h-2.5 bg-app-border rounded w-20" />
          </View>
        </View>
        <View className="items-end">
          <ShimmerBlock className="h-2.5 bg-app-border rounded w-8 mb-1" />
          <ShimmerBlock className="h-3.5 bg-app-border rounded w-12" />
        </View>
      </View>

      <View className="flex-row border-t border-app-border pt-3 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} className="flex-1">
            <ShimmerBlock className="h-2.5 bg-app-border rounded w-10 mb-1.5" />
            <ShimmerBlock className="h-3.5 bg-app-border rounded w-12" />
          </View>
        ))}
      </View>
    </View>
  )
}

export const ExploreRowSkeleton = memo(ExploreRowSkeletonComponent)
