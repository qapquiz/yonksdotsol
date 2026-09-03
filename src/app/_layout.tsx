import { useEffect } from 'react'
import '../global.css'

import { Slot } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Uniwind } from 'uniwind'
import { MobileWalletProvider, createSolanaMainnet } from '../wallet/walletKit'
import { useSettingsStore } from '../stores/settingsStore'
import { PixelFontProvider } from '../hooks/useFontConfig'
import { useWidgetSync } from '../hooks/useWidgetSync'
import { Observe, ObserveRoot } from '../observe'
import { env } from '../config/env'

// EAS Observe: per-route navigation metrics. Must run at module scope,
// before any screen mounts — toggling it later throws.
Observe.configure({
  integrations: { 'expo-router': true },
})

const cluster = createSolanaMainnet({ url: env.rpcUrl || '' })
const identity = {
  name: 'Yonks',
  uri: 'https://github.com/qapquiz/yonksdotsol',
  icon: './assets/images/icon.png',
}

function RootLayout() {
  const theme = useSettingsStore((s) => s.theme)

  // Sync settings store theme → Uniwind
  useEffect(() => {
    Uniwind.setTheme(theme)
  }, [theme])

  // Keep home-screen widget in sync when app is foregrounded
  useWidgetSync()

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

// EAS Observe: measures Time to First Render (TTR) around the root layout
export default ObserveRoot.wrap(RootLayout)
