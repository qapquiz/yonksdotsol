import { useEffect } from 'react'
import '../global.css'

import { Slot } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { MobileWalletProvider, createSolanaMainnet } from '@wallet-ui/react-native-kit'
import { Uniwind } from 'uniwind'
import { useSettingsStore } from '../stores/settingsStore'
import { PixelFontProvider } from '../hooks/useFontConfig'
import { env } from '../config/env'

const cluster = createSolanaMainnet({ url: env.rpcUrl || '' })
const identity = {
  name: 'Yonks',
  uri: 'https://github.com/qapquiz/yonksdotsol',
  icon: './assets/images/icon.png',
}

export default function Layout() {
  const theme = useSettingsStore((s) => s.theme)

  // Sync settings store theme → Uniwind
  useEffect(() => {
    Uniwind.setTheme(theme)
  }, [theme])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PixelFontProvider>
        <MobileWalletProvider cluster={cluster} identity={identity}>
          <Slot />
        </MobileWalletProvider>
      </PixelFontProvider>
    </GestureHandlerRootView>
  )
}
