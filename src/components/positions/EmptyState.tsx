import { memo, useCallback } from 'react'
import { Linking, Text, View } from 'react-native'
import { PixelAvatar } from '../ui/PixelAvatar'

function EmptyState() {
  const handleLearnMore = useCallback(() => {
    Linking.openURL('https://www.meteora.ag/starter')
  }, [])

  return (
    <View className="flex-1 items-center justify-start pt-24">
      <View className="mb-6 opacity-60">
        <PixelAvatar size={64} variant="ghost" connected={false} />
      </View>
      <Text className="text-2xl font-sans-bold text-app-text mb-2">No positions found</Text>
      <Text className="text-base text-app-text-secondary text-center mb-4">
        This wallet does not have any active DLMM positions yet.
      </Text>
      <Text className="text-sm text-app-text-secondary text-center">
        Learn to create one on{' '}
        <Text className="text-app-primary font-sans-bold" onPress={handleLearnMore}>
          Meteora →
        </Text>
      </Text>
    </View>
  )
}

export default memo(EmptyState)
