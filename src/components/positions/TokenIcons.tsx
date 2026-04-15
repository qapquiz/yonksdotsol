import { Image } from 'expo-image'
import { memo } from 'react'
import { Text, View } from 'react-native'
import type { TokenInfo } from '../../tokens'

interface TokenIconsProps {
  tokenXInfo: TokenInfo | null
  tokenYInfo: TokenInfo | null
}

const FALLBACK_BLURHASH = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj'

function TokenIcon({
  tokenInfo,
  zIndex,
  marginLeft,
  recyclingKey,
}: {
  tokenInfo: TokenInfo | null
  zIndex: string
  marginLeft: string
  recyclingKey: string
}) {
  if (!tokenInfo?.cdn_url) {
    return (
      <View
        className={`w-8 h-8 rounded-full bg-app-surface-highlight border border-app-surface-highlight items-center justify-center ${marginLeft} ${zIndex}`}
      >
        <Text className="text-app-text text-xs font-bold">{tokenInfo?.symbol?.[0] || '?'}</Text>
      </View>
    )
  }

  return (
    <Image
      className={`w-8 h-8 rounded-full bg-app-surface-highlight border border-app-surface-highlight ${marginLeft} ${zIndex}`}
      source={{ uri: tokenInfo.cdn_url }}
      placeholder={{ blurhash: FALLBACK_BLURHASH }}
      contentFit="cover"
      cachePolicy="memory-disk"
      recyclingKey={recyclingKey}
      transition={200}
    />
  )
}

function TokenIconsComponent({ tokenXInfo, tokenYInfo }: TokenIconsProps) {
  return (
    <View className="flex-row">
      <TokenIcon tokenInfo={tokenXInfo} zIndex="z-10" marginLeft="" recyclingKey={tokenXInfo?.mint ?? 'x-unknown'} />
      <TokenIcon tokenInfo={tokenYInfo} zIndex="" marginLeft="-ml-3" recyclingKey={tokenYInfo?.mint ?? 'y-unknown'} />
    </View>
  )
}

export const TokenIcons = memo(TokenIconsComponent)
