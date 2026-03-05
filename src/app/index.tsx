import { Feather, Ionicons } from '@expo/vector-icons'
import type { PositionInfo } from '@meteora-ag/dlmm'
import DLMM from '@meteora-ag/dlmm'
import { Connection, PublicKey } from '@solana/web3.js'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { env } from '../config/env'
import { CacheManager } from '../utils/cache/CacheManager'
import PositionsList from './positions'

export default function App() {
  const { account, disconnect, signIn } = useMobileWallet()
  const [isConnecting, setIsConnecting] = useState(false)
  const connection = useMemo(() => new Connection(env.rpcUrl || ''), [])
  const [positions, setPositions] = useState<Map<string, PositionInfo>>(new Map())
  const [isLoadingPositions, setIsLoadingPositions] = useState(true)
  const previousAccountRef = useRef<string | null>(null)
  const getPositions = useCallback(async (connection: Connection, wallet: PublicKey) => {
    setIsLoadingPositions(true)
    try {
      const pos = await DLMM.getAllLbPairPositionsByUser(connection, wallet)
      setPositions(pos)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingPositions(false)
    }
  }, [])

  const handleRefresh = useCallback(() => {
    if (account?.address) {
      getPositions(connection, new PublicKey(account.address))
    }
  }, [connection, account?.address, getPositions])
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
      setIsLoadingPositions(false)
      return
    }

    getPositions(connection, new PublicKey(account.address))
  }, [connection, account?.address, getPositions])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <View className="px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View
              className={`h-10 w-10 items-center justify-center rounded-full ${
                account ? 'bg-app-primary-dim' : 'bg-app-surface-highlight'
              }`}
            >
              <Feather name="user" size={20} color={account ? '#8FA893' : '#999999'} />
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
            {/*<View className="h-10 w-10 items-center justify-center rounded-full bg-app-surface-highlight">
							<Feather name="bell" size={20} color="#999999" />
						</View>
						*/}
            <Pressable
              onPress={account ? disconnect : handleConnectWallet}
              disabled={isConnecting}
              className={`h-10 w-10 items-center justify-center rounded-full bg-app-surface-highlight active:opacity-80 ${
                account ? 'border border-app-primary' : ''
              } ${isConnecting ? 'opacity-50' : ''}`}
            >
              <Ionicons name="wallet-outline" size={20} color={account ? '#8FA893' : '#999999'} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={isLoadingPositions} onRefresh={handleRefresh} tintColor="#8FA893" />
        }
      >
        <PositionsList positions={positions} isLoadingPositions={isLoadingPositions} />
      </ScrollView>

      <StatusBar style="auto" />
    </SafeAreaView>
  )
}
