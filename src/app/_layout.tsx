import '../global.css'

import { Slot } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { MobileWalletProvider, createSolanaDevnet } from '@wallet-ui/react-native-kit'
import { LoadingProvider } from '../contexts/LoadingContext'

const cluster = createSolanaDevnet()
const identity = {
  name: 'Yonks',
  uri: 'https://github.com/qapquiz/yonksdotsol',
  icon: './assets/images/icon.png',
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LoadingProvider>
        <MobileWalletProvider cluster={cluster} identity={identity}>
          <Slot />
        </MobileWalletProvider>
      </LoadingProvider>
    </GestureHandlerRootView>
  )
}
