import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseWalletLifecycleResult {
  /** True when wallet provider has resolved (accounts !== null or timed out) */
  walletReady: boolean
  /** Current wallet address or undefined */
  walletAddress: string | undefined
  /** True while a sign-in attempt is in progress */
  isConnecting: boolean
  /** Initiate wallet sign-in */
  handleConnect: () => Promise<void>
  /** Disconnect the wallet */
  handleDisconnect: () => Promise<void>
}

const WALLET_TIMEOUT_MS = 500

export function useWalletLifecycle(): UseWalletLifecycleResult {
  const { account, accounts, disconnect, signIn } = useMobileWallet()
  const [isConnecting, setIsConnecting] = useState(false)
  const [walletCheckTimedOut, setWalletCheckTimedOut] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fallback timeout in case wallet provider doesn't update accounts state
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (accounts === null) {
        setWalletCheckTimedOut(true)
      }
    }, WALLET_TIMEOUT_MS)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [accounts])

  // Once we've seen a valid account, wallet is permanently "ready"
  // so disconnect never causes walletReady to flip back to false
  useEffect(() => {
    if (account?.address) {
      setWalletCheckTimedOut(true)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [account?.address])

  const walletReady = accounts !== null || walletCheckTimedOut

  const handleConnect = useCallback(async () => {
    setIsConnecting(true)
    try {
      await signIn({
        domain: 'yonksdotsol.app',
        statement: 'Sign in to access your DLMM positions',
        version: '1',
      })
    } catch (error) {
      console.error('Wallet connection failed:', error)
      await disconnect().catch(() => {})
    } finally {
      setIsConnecting(false)
    }
  }, [signIn, disconnect])

  const handleDisconnect = useCallback(async () => {
    await disconnect()
  }, [disconnect])

  return {
    walletReady,
    walletAddress: account?.address,
    isConnecting,
    handleConnect,
    handleDisconnect,
  }
}
