import { memo } from 'react'
import { View } from 'react-native'

interface PixelAvatarProps {
  size?: number
  variant?: 'bot' | 'alien' | 'ghost' | 'robot' | 'cat'
  connected?: boolean
}

const AVATARS = {
  bot: [
    [0, 1, 1, 1, 1, 0],
    [1, 0, 1, 1, 0, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 1],
    [0, 1, 0, 0, 1, 0],
    [0, 0, 1, 1, 0, 0],
  ],
  alien: [
    [0, 0, 1, 1, 0, 0],
    [0, 1, 2, 2, 1, 0],
    [1, 2, 1, 1, 2, 1],
    [1, 1, 1, 1, 1, 1],
    [0, 1, 0, 0, 1, 0],
    [0, 0, 1, 1, 0, 0],
  ],
  ghost: [
    [0, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1],
    [1, 0, 1, 1, 0, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 0, 1, 0, 1, 0],
  ],
  robot: [
    [1, 1, 1, 1, 1, 1],
    [1, 2, 1, 1, 2, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 0, 1, 1, 0, 1],
    [1, 1, 0, 0, 1, 1],
    [1, 0, 0, 0, 0, 1],
  ],
  cat: [
    [1, 0, 0, 0, 0, 1],
    [1, 2, 1, 1, 2, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 2, 1, 1, 2, 1],
    [1, 1, 0, 0, 1, 1],
    [0, 1, 1, 1, 1, 0],
  ],
}

function PixelAvatarComponent({ size = 40, variant = 'bot', connected = false }: PixelAvatarProps) {
  const pattern = AVATARS[variant]
  const pixelSize = size / 6
  const primaryColor = connected ? '#8FA893' : '#999999'
  const secondaryColor = connected ? '#2a332c' : '#1a1a1a'

  return (
    <View style={{ width: size, height: size }}>
      {pattern.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: 'row' }}>
          {row.map((pixel, colIndex) => {
            const backgroundColor = pixel === 0 ? 'transparent' : pixel === 2 ? secondaryColor : primaryColor
            return (
              <View
                key={colIndex}
                style={{
                  width: pixelSize,
                  height: pixelSize,
                  backgroundColor,
                  borderRadius: pixelSize / 6,
                }}
              />
            )
          })}
        </View>
      ))}
    </View>
  )
}

export const PixelAvatar = memo(PixelAvatarComponent)
