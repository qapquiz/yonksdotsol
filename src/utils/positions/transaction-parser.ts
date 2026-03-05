import { address, createSolanaRpc, isSolanaError } from '@solana/kit'

export interface SignatureWithMetadata {
  signature: string
  slot: number
  blockTime: number | null
  confirmationStatus: 'confirmed' | 'finalized' | null
  err: any
  memo: string | null
}

export interface TransactionWithAmounts {
  signature: string
  blockTime: number | null
  xAmount: bigint
  yAmount: bigint
  operation: 'add' | 'remove'
}

export interface CostBasisWithTransactions {
  netX: bigint
  netY: bigint
  transactions: TransactionWithAmounts[]
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

export async function calculateTrueCostBasis(
  rpc: ReturnType<typeof createSolanaRpc>,
  positionAddress: string,
  signatures: SignatureWithMetadata[],
): Promise<CostBasisWithTransactions | null> {
  let totalAddedX = 0n
  let totalAddedY = 0n
  let totalRemovedX = 0n
  let totalRemovedY = 0n
  const transactions: TransactionWithAmounts[] = []
  for (const sig of signatures) {
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
          const info = ix.parsed.info as any

          if (ix.parsed.type === 'initializePosition' || ix.parsed.type === 'initializePosition2') {
            const amountX = BigInt(info?.liquidityParameter?.amountX ?? 0)
            const amountY = BigInt(info?.liquidityParameter?.amountY ?? 0)
            totalAddedX += amountX
            totalAddedY += amountY
            transactions.push({
              signature: sig.signature,
              blockTime: sig.blockTime,
              xAmount: amountX,
              yAmount: amountY,
              operation: 'add',
            })
          } else if (ix.parsed.type === 'addLiquidity' || ix.parsed.type === 'addLiquidity2') {
            const amountX = BigInt(info?.liquidityParameter?.amountX ?? 0)
            const amountY = BigInt(info?.liquidityParameter?.amountY ?? 0)
            totalAddedX += amountX
            totalAddedY += amountY
            transactions.push({
              signature: sig.signature,
              blockTime: sig.blockTime,
              xAmount: amountX,
              yAmount: amountY,
              operation: 'add',
            })
          } else if (ix.parsed.type === 'removeLiquidity' || ix.parsed.type === 'removeLiquidity2') {
            const amountX = BigInt(info?.liquidityParameter?.amountX ?? 0)
            const amountY = BigInt(info?.liquidityParameter?.amountY ?? 0)
            totalRemovedX += amountX
            totalRemovedY += amountY
            transactions.push({
              signature: sig.signature,
              blockTime: sig.blockTime,
              xAmount: amountX,
              yAmount: amountY,
              operation: 'remove',
            })
          }
        }
      }
    } catch (error) {
      console.error(`Error parsing transaction ${sig.signature}:`, error)
      continue
    }
  }

  const netX = totalAddedX - totalRemovedX
  const netY = totalAddedY - totalRemovedY

  if (netX === 0n && netY === 0n) {
    return null
  }

  return { netX, netY, transactions }
}

export async function getInitialDeposits(
  rpc: ReturnType<typeof createSolanaRpc>,
  positionAddress: string,
  tokenXDecimals: number,
  tokenYDecimals: number,
): Promise<CostBasisWithTransactions | null> {
  try {
    const signatures = await fetchPositionTransactionSignatures(rpc, positionAddress, 100)

    if (signatures.length === 0) {
      console.warn(`No signatures found for position ${positionAddress}`)
      return null
    }

    const costBasis = await calculateTrueCostBasis(rpc, positionAddress, signatures)

    if (!costBasis) {
      console.warn(`No liquidity found for position ${positionAddress}`)
      return null
    }

    return costBasis
  } catch (error) {
    console.error('Error fetching initial deposits:', error)
    return null
  }
}
