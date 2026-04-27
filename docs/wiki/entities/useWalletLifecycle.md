---
title: useWalletLifecycle
type: entity
location: src/hooks/useWalletLifecycle.ts
created: 2026-04-28
updated: 2026-04-28
tags: [hook, wallet, state]
related:
  - usePositionsPage
---

# useWalletLifecycle

Manages wallet connection lifecycle with timeout fallback.

## Location

`src/hooks/useWalletLifecycle.ts`

## Responsibilities

- Wraps `@wallet-ui/react-native-kit` `useMobileWallet`
- Provides timeout fallback (500ms) if wallet provider doesn't update state
- Handles sign-in and disconnect actions
- Prevents `walletReady` from flipping back to false after disconnect

## Returned Data

```typescript
interface UseWalletLifecycleResult {
  walletReady: boolean          // True once resolved (connected or not)
  walletAddress: string | undefined
  isConnecting: boolean
  handleConnect: () => Promise<void>
  handleDisconnect: () => Promise<void>
}
```

## Timeout Behavior

If `accounts` stays null for 500ms, `walletCheckTimedOut` becomes true and `walletReady` resolves to true. This prevents infinite loading states.

## See Also

- [[usePositionsPage]] — consumes wallet state
