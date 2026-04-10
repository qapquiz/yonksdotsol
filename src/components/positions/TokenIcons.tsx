import { memo, useState } from 'react'
import { Image, Text, View } from 'react-native'
import type { TokenInfo } from '../../tokens'

interface TokenIconsProps {
  tokenXInfo: TokenInfo | null
  tokenYInfo: TokenInfo | null
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
        <Text className="text-app-text text-xs font-bold">{tokenXInfo?.symbol?.[0] || '?'}</Text>
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
        <Text className="text-app-text text-xs font-bold">{tokenYInfo?.symbol?.[0] || '?'}</Text>
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
