/**
 * Native seam for EAS Observe.
 *
 * Re-exports the real `expo-observe` API so app code never imports the package
 * directly. Metrics are collected from native builds only; the web platform
 * gets the no-op stub in `index.web.tsx`. Keep both files' exports in sync.
 */
export { Observe, ObserveErrorBoundary, ObserveRoot, useObserve } from 'expo-observe'
