import '../global.css'

import { Slot } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { MobileWalletProvider, createSolanaMainnet } from '@wallet-ui/react-native-kit'
import { env } from '../config/env'

const cluster = createSolanaMainnet({ url: env.rpcUrl || '' })
const identity = {
  name: 'Yonks',
  uri: 'https://github.com/qapquiz/yonksdotsol',
  icon: './assets/images/icon.png',
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MobileWalletProvider cluster={cluster} identity={identity}>
        <Slot />
      </MobileWalletProvider>
    </GestureHandlerRootView>
  )
}
