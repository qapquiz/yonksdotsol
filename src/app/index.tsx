import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PixelAvatar } from '../components/ui/PixelAvatar'
import { usePositionsPage } from '../hooks/usePositionsPage'
import { useSettingsStore } from '../stores/settingsStore'
import { useThemeTokens } from '../hooks/useThemeTokens'
import { useWalletLifecycle } from '../hooks/useWalletLifecycle'
import PositionsList from './positions'

export default function App() {
  const theme = useSettingsStore((s) => s.theme)
  const toggleTheme = useSettingsStore((s) => s.toggleTheme)
  const tokens = useThemeTokens()

  const { walletReady, walletAddress, isConnecting, handleConnect, handleDisconnect } = useWalletLifecycle()

  const pageData = usePositionsPage(walletAddress, walletReady)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
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
              <Ionicons name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={20} color={tokens.primary} />
            </Pressable>
            <Pressable
              onPress={walletAddress ? handleDisconnect : handleConnect}
              disabled={isConnecting}
              className={`h-10 w-10 items-center justify-center rounded-full bg-app-surface-highlight active:opacity-80 ${
                walletAddress ? 'border border-app-primary' : ''
              } ${isConnecting ? 'opacity-50' : ''}`}
            >
              <Ionicons name="wallet-outline" size={20} color={walletAddress ? tokens.primary : tokens.textSecondary} />
            </Pressable>
          </View>
        </View>
      </View>

      <View className="flex-1">
        <PositionsList
          positions={pageData.positions}
          summary={pageData.summary}
          hasPnLData={pageData.hasPnLData}
          outOfRangeCount={pageData.outOfRangeCount}
          positionCount={pageData.positionCount}
          loading={pageData.loading}
          tokenDataReady={pageData.tokenDataReady}
          walletResolved={pageData.walletResolved}
          walletAddress={pageData.walletAddress}
          refresh={pageData.refresh}
        />
      </View>

      <StatusBar style={tokens.statusBar} />
    </SafeAreaView>
  )
}
