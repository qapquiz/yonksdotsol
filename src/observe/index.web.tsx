/**
 * Web stub for the EAS Observe seam.
 *
 * EAS Observe is a native library — metrics are only collected from Android
 * builds (dev client / EAS builds), so the real package and its
 * expo-app-metrics dependency never load on web. Every export here is a no-op.
 * Keep both files' exports in sync with `index.ts`.
 */
import { useCallback } from 'react'
import type { ComponentType, ReactNode } from 'react'
import type { ObserveConfig } from 'expo-observe'

export const Observe = {
  /** No-op on web — collection only happens in native builds. */
  configure(_config: ObserveConfig): void {},
  /** No-op on web — user-defined events only fire in native builds. */
  logEvent(_name: string, _options?: unknown): void {},
}

export const ObserveRoot = {
  /** Identity on web — no metrics provider is needed. */
  wrap<P extends Record<string, unknown>>(Component: ComponentType<P>): ComponentType<P> {
    return Component
  },
}

/** Passthrough on web — render children unchanged, no error capture. */
export function ObserveErrorBoundary({ children }: { children: ReactNode; fallback?: unknown }): ReactNode {
  return children
}

export function useObserve(): { markInteractive: () => void } {
  const markInteractive = useCallback(() => {}, [])
  return { markInteractive }
}
