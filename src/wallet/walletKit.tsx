/**
 * Native wallet kit re-export.
 *
 * Consumers import from this module instead of `@wallet-ui/react-native-kit`
 * directly. Metro resolves `walletKit.web.tsx` on web, which provides an
 * inert stub (web preview always runs in dev-mock mode and never needs a
 * real Mobile Wallet Adapter session).
 */
export { MobileWalletProvider, createSolanaMainnet, useMobileWallet } from '@wallet-ui/react-native-kit'
