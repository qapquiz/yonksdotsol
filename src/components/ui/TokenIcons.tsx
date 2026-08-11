import { memo, useState } from 'react'
import { Image, Text, View } from 'react-native'

/**
 * Minimal icon source — anything with an optional logo URL + symbol. Both the
 * full `TokenInfo` (positions) and the lighter `TokenLogo` (explore) satisfy
 * this; the component only reads these two fields.
 */
export interface TokenIconSource {
  cdn_url?: string | null
  symbol?: string | null
}

interface TokenIconsProps {
  tokenXInfo?: TokenIconSource | null
  tokenYInfo?: TokenIconSource | null
}

function TokenIconsComponent({ tokenXInfo, tokenYInfo }: TokenIconsProps) {
  const [xError, setXError] = useState(false)
  const [yError, setYError] = useState(false)

  const TokenXIcon =
    tokenXInfo?.cdn_url && !xError ? (
      <Image
        className="w-8 h-8 rounded-full bg-app-surface-highlight border border-app-surface-highlight z-10"
        source={{ uri: tokenXInfo.cdn_url }}
        onError={() => setXError(true)}
      />
    ) : (
      <View className="w-8 h-8 rounded-full bg-app-surface-highlight border border-app-surface-highlight z-10 items-center justify-center">
        <Text className="text-app-text text-xs font-sans-bold">{tokenXInfo?.symbol?.[0] || '?'}</Text>
      </View>
    )

  const TokenYIcon =
    tokenYInfo?.cdn_url && !yError ? (
      <Image
        className="w-8 h-8 rounded-full bg-app-surface-highlight border border-app-surface-highlight -ml-3"
        source={{ uri: tokenYInfo.cdn_url }}
        onError={() => setYError(true)}
      />
    ) : (
      <View className="w-8 h-8 rounded-full bg-app-surface-highlight border border-app-surface-highlight -ml-3 items-center justify-center">
        <Text className="text-app-text text-xs font-sans-bold">{tokenYInfo?.symbol?.[0] || '?'}</Text>
      </View>
    )

  return (
    <View className="flex-row">
      {TokenXIcon}
      {TokenYIcon}
    </View>
  )
}

export const TokenIcons = memo(TokenIconsComponent)
