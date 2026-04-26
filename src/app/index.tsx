import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PixelAvatar } from '../components/ui/PixelAvatar'
import { usePositionFetch } from '../hooks/positions/usePositionFetch'
import { useSettingsStore } from '../stores/settingsStore'
import { useWalletLifecycle } from '../hooks/useWalletLifecycle'
import PositionsList from './positions'

export default function App() {
  const theme = useSettingsStore((s) => s.theme)
  const toggleTheme = useSettingsStore((s) => s.toggleTheme)
  const themeColors = useMemo(
    () => ({
      bg: theme === 'dark' ? '#050505' : '#f5f5f5',
      primary: theme === 'dark' ? '#8FA893' : '#6b8f71',
      textSecondary: theme === 'dark' ? '#999999' : '#666666',
    }),
    [theme],
  )

  const { walletReady, walletAddress, isConnecting, handleConnect, handleDisconnect } = useWalletLifecycle()
  const { positions, isLoading, refresh } = usePositionFetch(walletAddress)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <View className="px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View
              className={`h-10 w-10 items-center justify-center rounded-full ${
                walletAddress ? 'bg-app-primary-dim' : 'bg-app-surface-highlight'
              }`}
            >
              <PixelAvatar size={24} variant="cat" connected={!!walletAddress} />
            </View>
            <View>
              <Text className="text-xs font-sans-bold uppercase tracking-wider text-app-text-secondary">
                {isConnecting
                  ? 'Connecting...'
                  : walletAddress
                    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
                    : walletReady
                      ? 'Not Connected'
                      : '...'}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={toggleTheme}
              className="h-10 w-10 items-center justify-center rounded-full bg-app-surface-highlight active:opacity-80"
            >
              <Ionicons
                name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'}
                size={20}
                color={themeColors.primary}
              />
            </Pressable>
            <Pressable
              onPress={walletAddress ? handleDisconnect : handleConnect}
              disabled={isConnecting}
              className={`h-10 w-10 items-center justify-center rounded-full bg-app-surface-highlight active:opacity-80 ${
                walletAddress ? 'border border-app-primary' : ''
              } ${isConnecting ? 'opacity-50' : ''}`}
            >
              <Ionicons
                name="wallet-outline"
                size={20}
                color={walletAddress ? themeColors.primary : themeColors.textSecondary}
              />
            </Pressable>
          </View>
        </View>
      </View>

      <View className="flex-1">
        <PositionsList
          positions={positions}
          isLoadingPositions={isLoading}
          walletResolved={walletReady}
          ownerAddress={walletAddress}
          onRefresh={refresh}
        />
      </View>

      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  )
}
