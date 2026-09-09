import { createMMKV } from 'react-native-mmkv'

const mmkv = createMMKV({ id: 'wallet' })

const WALLET_ADDRESS_KEY = 'wallet_address'
const WALLET_REVISION_KEY = 'wallet_revision'

export interface StoredWalletSnapshot {
  address: string | undefined
  revision: number
}

export function getStoredWalletAddress(): string | undefined {
  const val = mmkv.getString(WALLET_ADDRESS_KEY)
  return val && val.length > 0 ? val : undefined
}

/** Revision distinguishes reconnecting the same wallet from its previous session. */
export function getStoredWalletSnapshot(): StoredWalletSnapshot {
  return { address: getStoredWalletAddress(), revision: mmkv.getNumber(WALLET_REVISION_KEY) ?? 0 }
}

export function subscribeStoredWalletAddress(listener: () => void): () => void {
  const subscription = mmkv.addOnValueChangedListener((key) => {
    if (key === WALLET_ADDRESS_KEY) listener()
  })
  return () => subscription.remove()
}

export function setStoredWalletAddress(address: string | undefined): void {
  if (getStoredWalletAddress() === (address || undefined)) return

  // Write the revision first so address listeners see the complete transition.
  mmkv.set(WALLET_REVISION_KEY, (mmkv.getNumber(WALLET_REVISION_KEY) ?? 0) + 1)
  if (address) {
    mmkv.set(WALLET_ADDRESS_KEY, address)
  } else {
    mmkv.remove(WALLET_ADDRESS_KEY)
  }
}
