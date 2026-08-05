import { memo } from 'react'
import { View } from 'react-native'

import { ShimmerBlock } from '../ui/ShimmerBlock'

/**
 * Loading placeholder for the Pool Depth view. Mirrors the loaded layout:
 * a boxed header card (title + three stat rows) above a chart panel.
 */
function PoolDepthSkeletonComponent() {
  return (
    <View className="px-4 pt-2">
      {/* Header card */}
      <View className="bg-app-surface rounded-3xl p-5 mb-4 border border-app-border">
        <View className="flex-row items-center justify-between mb-1">
          <ShimmerBlock className="h-5 bg-app-border rounded w-32" />
          <ShimmerBlock className="h-3 bg-app-border rounded w-16" />
        </View>
        <ShimmerBlock className="h-3 bg-app-border rounded w-40 mb-4" />

        <View className="flex-row border-t border-app-border pt-4 gap-3 mb-4">
          <View className="flex-1">
            <ShimmerBlock className="h-2.5 bg-app-border rounded w-12 mb-1.5" />
            <ShimmerBlock className="h-4 bg-app-border rounded w-14" />
          </View>
          <View className="flex-1">
            <ShimmerBlock className="h-2.5 bg-app-border rounded w-14 mb-1.5" />
            <ShimmerBlock className="h-4 bg-app-border rounded w-14" />
          </View>
          <View className="flex-1">
            <ShimmerBlock className="h-2.5 bg-app-border rounded w-12 mb-1.5" />
            <ShimmerBlock className="h-4 bg-app-border rounded w-14" />
          </View>
        </View>

        <View className="flex-row border-t border-app-border pt-4 gap-3">
          <View className="flex-1">
            <ShimmerBlock className="h-2.5 bg-app-border rounded w-10 mb-1.5" />
            <ShimmerBlock className="h-4 bg-app-border rounded w-16" />
          </View>
          <View className="flex-1">
            <ShimmerBlock className="h-2.5 bg-app-border rounded w-12 mb-1.5" />
            <ShimmerBlock className="h-4 bg-app-border rounded w-16" />
          </View>
          <View className="flex-1">
            <ShimmerBlock className="h-2.5 bg-app-border rounded w-8 mb-1.5" />
            <ShimmerBlock className="h-4 bg-app-border rounded w-12" />
          </View>
        </View>
      </View>

      {/* Chart panel */}
      <View className="bg-app-surface rounded-3xl p-5 border border-app-border">
        <View className="flex-row justify-between items-baseline mb-3">
          <ShimmerBlock className="h-2.5 bg-app-border rounded w-28" />
          <ShimmerBlock className="h-2.5 bg-app-border rounded w-16" />
        </View>
        <View className="flex-row items-end gap-1" style={{ height: 160 }}>
          {Array.from({ length: 24 }).map((_, i) => (
            <View key={i} className="flex-1">
              <ShimmerBlock className="bg-app-border rounded-sm" style={{ height: 20 + ((i * 37) % 130) }} />
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

export const PoolDepthSkeleton = memo(PoolDepthSkeletonComponent)
