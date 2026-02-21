import type { PositionInfo } from '@meteora-ag/dlmm'
import DLMM from '@meteora-ag/dlmm'
import { Connection, PublicKey } from '@solana/web3.js'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native'
import PositionsList from './positions'

export default function App() {
  const { account, connect, disconnect } = useMobileWallet()
  const connection = useMemo(() => new Connection(process.env.EXPO_PUBLIC_RPC_URL || ''), [])
  const [positions, setPositions] = useState<Map<string, PositionInfo>>(new Map())

  useEffect(() => {
    const getPositions = async (connection: Connection, wallet: PublicKey) => {
      try {
        const pos = await DLMM.getAllLbPairPositionsByUser(connection, wallet)
        console.log(pos)
        setPositions(pos)
      } catch (e) {
        console.error(e)
      }
    }

    // if (account?.address === undefined) {
    // 	return;
    // }

    const tempWallet = new PublicKey('87bdcSg4zvjExbvsUSbGifYUp75JdLhLafjgwvCjzjkA')
    // getPositions(connection, new PublicKey(account.address));
    getPositions(connection, new PublicKey(tempWallet))
  }, [connection, account?.address])

  return (
    <SafeAreaView className="flex-1 bg-app-bg">
      <View className="px-4 py-4 border-b border-app-border">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-extrabold text-app-text tracking-tight">🚀 Positions</Text>
          {account ? (
            <View className="flex-row items-center gap-2">
              <Text className="text-sm text-app-text-secondary">{account.address.toString().slice(0, 8)}...</Text>
              <Pressable onPress={disconnect} className="bg-red-500/20 px-3 py-2 rounded-lg active:bg-red-500/30">
                <Text className="text-red-500 font-semibold text-xs">Disconnect</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={connect} className="bg-app-primary px-4 py-2 rounded-lg active:opacity-80">
              <Text className="text-black font-bold text-sm">Connect Wallet</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        <PositionsList positions={positions} />
      </ScrollView>

      <StatusBar style="auto" />
    </SafeAreaView>
  )
}
