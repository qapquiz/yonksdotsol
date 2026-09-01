import { Connection } from '@solana/web3.js'
import { env } from './env'

let instance: Connection | null = null

export function getSharedConnection(): Connection {
  if (!instance) {
    if (!env.rpcUrl) {
      throw new Error(
        'EXPO_PUBLIC_RPC_URL is not set — copy .env.example to .env and set your RPC endpoint before fetching on-chain data.',
      )
    }
    instance = new Connection(env.rpcUrl)
  }
  return instance
}
