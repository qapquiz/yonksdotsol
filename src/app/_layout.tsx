import '../global.css'

import { Slot } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { MobileWalletProvider, createSolanaDevnet } from '@wallet-ui/react-native-kit'

const cluster = createSolanaDevnet()
const identity = {
  name: 'Kit Expo Uniwind',
  uri: 'https://github.com/beeman/yonksdotsol',
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
