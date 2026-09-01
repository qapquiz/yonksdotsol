/**
 * Web stub for the native wallet kit.
 *
 * The web preview always runs with `env.devMock` enabled (see
 * `src/config/env.ts`), which short-circuits `useWalletLifecycle` before
 * any wallet value is read. These stubs only need to mount without
 * touching Mobile Wallet Adapter machinery.
 */
import type { ReactNode } from 'react'

interface StubAccount {
  address: string
}

interface StubCluster {
  url: string
}

export function createSolanaMainnet({ url }: { url: string }): StubCluster {
  return { url }
}

export function MobileWalletProvider({ children }: { children: ReactNode; cluster?: unknown; identity?: unknown }) {
  return <>{children}</>
}

export function useMobileWallet(): {
  account: StubAccount | null
  accounts: StubAccount[] | null
  signIn: (_options: unknown) => Promise<void>
  disconnect: () => Promise<void>
} {
  return {
    account: null,
    accounts: null,
    signIn: async () => {
      throw new Error('Mobile wallet is not available on web')
    },
    disconnect: async () => {},
  }
}
