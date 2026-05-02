import { createMMKV } from 'react-native-mmkv'

const mmkv = createMMKV({ id: 'wallet' })

const WALLET_ADDRESS_KEY = 'wallet_address'

export function getStoredWalletAddress(): string | undefined {
  const val = mmkv.getString(WALLET_ADDRESS_KEY)
  return val && val.length > 0 ? val : undefined
}

export function setStoredWalletAddress(address: string | undefined) {
  if (address) {
    mmkv.set(WALLET_ADDRESS_KEY, address)
  } else {
    mmkv.remove(WALLET_ADDRESS_KEY)
  }
}
