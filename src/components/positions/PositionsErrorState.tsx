import { Ionicons } from '@expo/vector-icons'
import { memo, useCallback } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useThemeTokens } from '../../hooks/useThemeTokens'

interface PositionsErrorStateProps {
  /** Clears the boundary's caught error and re-mounts the positions list */
  onRetry: () => void
}

/**
 * Fallback UI for the error boundary around the positions list.
 * The boundary records the render error as an EAS Observe `exception` event;
 * this component is what the user sees in its place.
 */
function PositionsErrorState({ onRetry }: PositionsErrorStateProps) {
  const tokens = useThemeTokens()

  const handleRetry = useCallback(() => {
    onRetry()
  }, [onRetry])

  return (
    <View className="flex-1 items-center justify-start px-4 pt-24">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-app-negative-dim mb-6">
        <Ionicons name="alert-outline" size={30} color={tokens.negativeDimText} />
      </View>
      <Text className="text-2xl font-sans-bold text-app-text mb-2">Something went wrong</Text>
      <Text className="text-base text-app-text-secondary text-center mb-8">
        The positions list hit an unexpected error while rendering.
      </Text>
      <Pressable onPress={handleRetry} className="rounded-full bg-app-primary px-8 py-3 active:opacity-80">
        <Text className="text-sm font-sans-bold uppercase tracking-wider text-app-on-primary">Try again</Text>
      </Pressable>
    </View>
  )
}

export default memo(PositionsErrorState)
