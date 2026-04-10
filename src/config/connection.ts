import { Connection } from '@solana/web3.js'
import { env } from './env'

let instance: Connection | null = null

export function getSharedConnection(): Connection {
  if (!instance) {
    instance = new Connection(env.rpcUrl || '')
  }
  return instance
}
