import { Ionicons } from '@expo/vector-icons'
import { memo, useCallback, useState } from 'react'
import { Modal, Pressable, Switch, Text, View } from 'react-native'
import * as Notifications from 'expo-notifications'
import { useSettingsStore } from '../../stores/settingsStore'
import { useThemeTokens } from '../../hooks/useThemeTokens'

interface SettingsSheetProps {
  visible: boolean
  onClose: () => void
}

function SettingsSheetComponent({ visible, onClose }: SettingsSheetProps) {
  const tokens = useThemeTokens()
  const alertsEnabled = useSettingsStore((s) => s.alertsEnabled)
  const setAlertsEnabled = useSettingsStore((s) => s.setAlertsEnabled)
  const [denied, setDenied] = useState(false)

  const handleToggle = useCallback(
    async (next: boolean) => {
      if (next) {
        const perm = await Notifications.requestPermissionsAsync()
        if (!perm.granted) {
          setDenied(true)
          setAlertsEnabled(false)
          return
        }
      }
      setDenied(false)
      setAlertsEnabled(next)
    },
    [setAlertsEnabled],
  )

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60" onPress={onClose}>
        <View className="flex-1 justify-end">
          <Pressable
            className="bg-app-surface rounded-t-3xl border-t border-app-border px-5 pt-4 pb-8"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="w-10 h-1 rounded-full bg-app-surface-highlight self-center mb-4" />
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-app-text text-lg font-sans-bold">Settings</Text>
              <Pressable onPress={onClose} className="p-1">
                <Ionicons name="close" size={22} color={tokens.textMuted} />
              </Pressable>
            </View>

            <View className="flex-row items-center justify-between rounded-2xl p-4 bg-app-surface-highlight border border-app-border">
              <View className="flex-1 pr-3">
                <Text className="text-app-text text-base font-sans-bold">Out-of-range alerts</Text>
                <Text className="text-app-text-secondary text-xs mt-0.5">
                  Notify me when a position stops earning fees
                </Text>
                {denied && (
                  <Text className="text-app-negative text-xs mt-1">
                    Notification permission denied. Enable it in system settings.
                  </Text>
                )}
              </View>
              <Switch value={alertsEnabled} onValueChange={handleToggle} />
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  )
}

export const SettingsSheet = memo(SettingsSheetComponent)
