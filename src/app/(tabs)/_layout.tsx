import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'

import { useThemeTokens } from '../../hooks/useThemeTokens'

/**
 * v2 root navigation — Option B (portfolio-first).
 *
 * Two tabs: Portfolio (home — your positions) and Explore (discovery). The
 * pool depth view (`/pool/[pairAddress]`) lives outside this group so it
 * pushes as a full screen with no tab bar. Both tab screens render their own
 * headers, so the default tab header is hidden.
 */
export default function TabsLayout() {
  const tokens = useThemeTokens()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.primary,
        tabBarInactiveTintColor: tokens.textMuted,
        tabBarStyle: {
          backgroundColor: tokens.surface,
          borderTopColor: tokens.border,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color }) => <Ionicons name="wallet-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <Ionicons name="compass-outline" size={22} color={color} />,
        }}
      />
    </Tabs>
  )
}
