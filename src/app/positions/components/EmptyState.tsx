import { Text, View } from 'react-native'

export default function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-12">
      <Text className="text-6xl mb-4">📊</Text>
      <Text className="text-2xl font-bold text-app-text mb-2">No positions found</Text>
      <Text className="text-base text-app-text-secondary text-center px-8">
        This wallet does not have any active DLMM positions yet.
      </Text>
    </View>
  )
}
