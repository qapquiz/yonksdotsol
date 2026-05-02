import { memo, useCallback } from 'react'
import { Linking, Text, View } from 'react-native'

function EmptyState() {
  const handleLearnMore = useCallback(() => {
    Linking.openURL('https://www.meteora.ag/starter')
  }, [])

  return (
    <View className="flex-1 items-center justify-start pt-24">
      <Text className="text-6xl mb-4">📊</Text>
      <Text className="text-2xl font-bold text-app-text mb-2">No positions found</Text>
      <Text className="text-base text-app-text-secondary text-center px-8 mb-4">
        This wallet does not have any active DLMM positions yet.
      </Text>
      <Text className="text-sm text-app-text-secondary text-center px-8">
        Learn to create one on{' '}
        <Text className="text-app-primary font-mono font-bold" onPress={handleLearnMore}>
          Meteora →
        </Text>
      </Text>
    </View>
  )
}

export default memo(EmptyState)
