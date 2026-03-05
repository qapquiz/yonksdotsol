import { address, createSolanaRpc, isSolanaError } from '@solana/kit'

export interface SignatureWithMetadata {
  signature: string
  slot: number
  blockTime: number | null
  confirmationStatus: 'confirmed' | 'finalized' | null
  err: any
  memo: string | null
}

export interface InitialDepositsResult {
  xAmount: bigint
  yAmount: bigint
}

function toSignature(signature: string) {
  return signature as any
}

export function createRpcClient(rpcUrl: string) {
  return createSolanaRpc(rpcUrl)
}

export async function fetchPositionTransactionSignatures(
  rpc: ReturnType<typeof createSolanaRpc>,
  positionAddress: string,
  limit: number = 100,
): Promise<SignatureWithMetadata[]> {
  try {
    const addr = address(positionAddress)
    const signatures = await rpc
      .getSignaturesForAddress(addr, {
        commitment: 'confirmed',
        limit,
      })
      .send()

    return signatures.map((sig: any) => ({
      signature: sig.signature,
      slot: sig.slot,
      blockTime: sig.blockTime ?? null,
      confirmationStatus: sig.confirmationStatus ?? null,
      err: sig.err,
      memo: sig.memo ?? null,
    }))
  } catch (error) {
    if (isSolanaError(error)) {
      console.error('Solana RPC error:', error)
    }
    throw error
  }
}

export async function findPositionCreationTransaction(
  rpc: ReturnType<typeof createSolanaRpc>,
  positionAddress: string,
  signatures: SignatureWithMetadata[],
): Promise<SignatureWithMetadata | null> {
  for (const sig of [...signatures].reverse()) {
    try {
      const tx = await rpc
        .getTransaction(toSignature(sig.signature), {
          encoding: 'jsonParsed',
          commitment: 'confirmed',
        })
        .send()

      if (!tx) continue

      const message = tx.transaction.message

      for (const ix of message.instructions) {
        if ('parsed' in ix && ix.program === 'dlmm') {
          if (ix.parsed.type === 'initializePosition' || ix.parsed.type === 'initializePosition2') {
            return sig
          }
        }
      }
    } catch (error) {
      console.error(`Error parsing transaction ${sig.signature}:`, error)
      continue
    }
  }

  return null
}

export async function findInitialLiquidityTransaction(
  rpc: ReturnType<typeof createSolanaRpc>,
  positionAddress: string,
  signatures: SignatureWithMetadata[],
  creationSignature: string,
): Promise<InitialDepositsResult | null> {
  for (const sig of signatures) {
    if (sig.signature === creationSignature) continue

    try {
      const tx = await rpc
        .getTransaction(toSignature(sig.signature), {
          encoding: 'jsonParsed',
          commitment: 'confirmed',
        })
        .send()

      if (!tx) continue

      const message = tx.transaction.message

      for (const ix of message.instructions) {
        if ('parsed' in ix && ix.program === 'dlmm') {
          if (ix.parsed.type === 'addLiquidity' || ix.parsed.type === 'addLiquidity2') {
            const info = ix.parsed.info as any
            const amountX = BigInt(info?.liquidityParameter?.amountX ?? 0)
            const amountY = BigInt(info?.liquidityParameter?.amountY ?? 0)

            return { xAmount: amountX, yAmount: amountY }
          }
        }
      }
    } catch (error) {
      console.error(`Error parsing transaction ${sig.signature}:`, error)
      continue
    }
  }

  return null
}

export async function getInitialDeposits(
  rpc: ReturnType<typeof createSolanaRpc>,
  positionAddress: string,
  tokenXDecimals: number,
  tokenYDecimals: number,
): Promise<InitialDepositsResult | null> {
  try {
    const signatures = await fetchPositionTransactionSignatures(rpc, positionAddress, 100)

    if (signatures.length === 0) {
      console.warn(`No signatures found for position ${positionAddress}`)
      return null
    }

    const creationTx = await findPositionCreationTransaction(rpc, positionAddress, signatures)

    if (!creationTx) {
      console.warn(`No creation transaction found for position ${positionAddress}`)
      return { xAmount: 0n, yAmount: 0n }
    }

    const liquidityResult = await findInitialLiquidityTransaction(
      rpc,
      positionAddress,
      signatures,
      creationTx.signature,
    )

    if (liquidityResult) {
      return liquidityResult
    }

    return { xAmount: 0n, yAmount: 0n }
  } catch (error) {
    console.error('Error fetching initial deposits:', error)
    return null
  }
}
