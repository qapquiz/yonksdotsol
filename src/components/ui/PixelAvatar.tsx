import { memo } from 'react'
import { Rect, Svg } from 'react-native-svg'

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
