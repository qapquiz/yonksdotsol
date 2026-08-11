import { useEffect, useMemo, useRef, useState } from 'react'

import { getTokenLogos } from '../services/tokenLogos'
import type { TokenLogo } from '../tokens'

/**
 * Batch-resolve token logos (icon URL + symbol) for a set of mints, keyed by
 * mint address, via Jupiter's token API.
 *
 * Backed by `getTokenLogos`, which caches each mint's logo per-mint with a
 * long TTL (logos are stable). The mint *set* is reduced to a sorted signature
 * so an unchanged set — even from a fresh array identity — doesn't refetch.
 *
 * Best-effort: while loading (or if a mint has no logo / the lookup fails) it
 * is simply absent from the returned map; callers should treat
 * `map.get(mint)` as nullable and let the icon component fall back to a
 * letter avatar.
 */
export function useTokenLogos(mints: string[]): Map<string, TokenLogo> {
  // Stable signature of the unique mint set — order-independent.
  const signature = useMemo(
    () =>
      Array.from(new Set(mints.filter(Boolean)))
        .sort()
        .join(','),
    [mints],
  )

  const [map, setMap] = useState<Map<string, TokenLogo>>(() => new Map())
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!signature) return

    let active = true
    const unique = signature.split(',')
    getTokenLogos(unique)
      .then((result) => {
        if (!active || !mountedRef.current) return
        setMap(result)
      })
      .catch((err: unknown) => {
        if (!active || !mountedRef.current) return
        console.error('[useTokenLogos] failed:', err)
      })

    return () => {
      active = false
    }
  }, [signature])

  return map
}
