import { memo } from 'react'
import { Rect, Svg } from 'react-native-svg'
import { useSettingsStore } from '../../stores/settingsStore'

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
  const theme = useSettingsStore((s) => s.theme)
  const pattern = AVATARS[variant]
  const pixelSize = size / 6
  const primaryColor = connected
    ? theme === 'dark' ? '#8FA893' : '#6b8f71'
    : theme === 'dark' ? '#999999' : '#666666'
  const secondaryColor = connected
    ? theme === 'dark' ? '#2a332c' : '#dce8de'
    : theme === 'dark' ? '#1a1a1a' : '#eeeeee'
  const rx = pixelSize / 6

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {pattern.map((row, rowIdx) =>
        row.map((pixel, colIdx) => {
          if (pixel === 0) return null
          return (
            <Rect
              key={`${rowIdx}-${colIdx}`}
              x={colIdx * pixelSize}
              y={rowIdx * pixelSize}
              width={pixelSize}
              height={pixelSize}
              fill={pixel === 2 ? secondaryColor : primaryColor}
              rx={rx}
            />
          )
        }),
      )}
    </Svg>
  )
}

export const PixelAvatar = memo(PixelAvatarComponent)
