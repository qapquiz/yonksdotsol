import { memo, useCallback } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSettingsStore } from '../../stores/settingsStore'
import { useThemeTokens } from '../../hooks/useThemeTokens'
import { PIXEL_FONT_OPTIONS } from '../../config/fonts'

interface FontPickerProps {
  visible: boolean
  onClose: () => void
}

function FontPickerComponent({ visible, onClose }: FontPickerProps) {
  const tokens = useThemeTokens()
  const currentPixelFont = useSettingsStore((s) => s.pixelFont)
  const setPixelFont = useSettingsStore((s) => s.setPixelFont)

  const handleSelect = useCallback(
    (id: string) => {
      setPixelFont(id)
    },
    [setPixelFont],
  )

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60" onPress={onClose}>
        <View className="flex-1 justify-end">
          <Pressable
            className="bg-app-surface rounded-t-3xl border-t border-app-border px-5 pt-4 pb-8"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <View className="w-10 h-1 rounded-full bg-app-surface-highlight self-center mb-4" />

            {/* Header */}
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-app-text text-lg font-sans-bold">Numeric Style</Text>
              <Pressable onPress={onClose} className="p-1">
                <Ionicons name="close" size={22} color={tokens.textMuted} />
              </Pressable>
            </View>

            {/* Preset list */}
            <View className="gap-2">
              {PIXEL_FONT_OPTIONS.map((option) => {
                const isSelected = option.id === currentPixelFont
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => handleSelect(option.id)}
                    className={`rounded-2xl p-4 border ${
                      isSelected
                        ? 'bg-app-primary-dim border-app-primary'
                        : 'bg-app-surface-highlight border-app-border'
                    }`}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text
                        className={`text-base ${isSelected ? 'text-app-primary' : 'text-app-text'}`}
                        style={{ fontFamily: option.fontFamily }}
                      >
                        {option.label}
                      </Text>
                      {isSelected && (
                        <View className="w-5 h-5 rounded-full bg-app-primary items-center justify-center">
                          <Ionicons name="checkmark" size={14} color="#050505" />
                        </View>
                      )}
                    </View>
                    <Text className="text-app-text text-sm" style={{ fontFamily: option.fontFamily }}>
                      1234.5678 SOL
                    </Text>
                    <Text className="text-app-text-secondary text-xs mt-0.5" style={{ fontFamily: option.fontFamily }}>
                      +12.34 (-5.67%)
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  )
}

export const FontPicker = memo(FontPickerComponent)
