import { Ionicons } from '@expo/vector-icons'
import type { PositionInfo } from '@meteora-ag/dlmm'
import DLMM from '@meteora-ag/dlmm'
import { PublicKey } from '@solana/web3.js'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PixelAvatar } from '../components/ui/PixelAvatar'
import { getSharedConnection } from '../config/connection'
import { useSettingsStore } from '../stores/settingsStore'
import { CacheManager } from '../utils/cache/CacheManager'
import { getUpnlPerPositionKey } from '../utils/cache/cacheKeys'
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
  const { account, disconnect, signIn } = useMobileWallet()
  const [isConnecting, setIsConnecting] = useState(false)
  const [positions, setPositions] = useState<Map<string, PositionInfo>>(new Map())
  const [isLoadingPositions, setIsLoadingPositions] = useState(true)
  const [walletResolved, setWalletResolved] = useState(false)
  const previousAccountRef = useRef<string | null>(null)
  const lastUpnlRefreshRef = useRef<number>(0)
  const getPositions = useCallback(async (wallet: PublicKey) => {
    setIsLoadingPositions(true)
    try {
      const pos = await DLMM.getAllLbPairPositionsByUser(getSharedConnection(), wallet)
      setPositions(pos)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingPositions(false)
    }
  }, [])

  const handleRefresh = useCallback(() => {
    if (account?.address) {
      const now = Date.now()
      if (now - lastUpnlRefreshRef.current > 30 * 1000) {
        CacheManager.getInstance().delete(getUpnlPerPositionKey(account.address))
        lastUpnlRefreshRef.current = now
      }
      getPositions(new PublicKey(account.address))
    }
  }, [account?.address, getPositions])
  const handleConnectWallet = useCallback(async () => {
    setIsConnecting(true)
    try {
      await signIn({
        domain: 'yonksdotsol.app',
        statement: 'Sign in to access your DLMM positions',
        version: '1',
      })
    } catch (error) {
      console.error('Wallet connection failed:', error)
      await disconnect().catch(() => {})
    } finally {
      setIsConnecting(false)
    }
  }, [signIn, disconnect])

  useEffect(() => {
    const currentAddress = account?.address ?? null

    if (currentAddress !== null && currentAddress !== previousAccountRef.current) {
      const wasConnected = previousAccountRef.current !== null
      if (wasConnected) {
        CacheManager.getInstance().invalidatePattern('initial_deposits:')
      }
    }

    previousAccountRef.current = currentAddress

    if (account?.address === undefined) {
      setPositions(new Map())
      setWalletResolved(true)
      setIsLoadingPositions(false)
      return
    }

    setWalletResolved(true)

    getPositions(new PublicKey(account.address))
  }, [account?.address, getPositions])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <View className="px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View
              className={`h-10 w-10 items-center justify-center rounded-full ${
                account ? 'bg-app-primary-dim' : 'bg-app-surface-highlight'
              }`}
            >
              <PixelAvatar size={24} variant="cat" connected={!!account} />
            </View>
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-app-text-secondary">
                {isConnecting
                  ? 'Connecting...'
                  : account
                    ? `${account.address.slice(0, 4)}...${account.address.slice(-4)}`
                    : 'Not Connected'}
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
              onPress={account ? disconnect : handleConnectWallet}
              disabled={isConnecting}
              className={`h-10 w-10 items-center justify-center rounded-full bg-app-surface-highlight active:opacity-80 ${
                account ? 'border border-app-primary' : ''
              } ${isConnecting ? 'opacity-50' : ''}`}
            >
              <Ionicons
                name="wallet-outline"
                size={20}
                color={account ? themeColors.primary : themeColors.textSecondary}
              />
            </Pressable>
          </View>
        </View>
      </View>

      <View className="flex-1">
        <PositionsList
          positions={positions}
          isLoadingPositions={isLoadingPositions}
          walletResolved={walletResolved}
          ownerAddress={account?.address}
          onRefresh={handleRefresh}
        />
      </View>

      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  )
}
