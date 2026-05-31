import { useState, useCallback } from 'react'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import DLMM from '@meteora-ag/dlmm'
import { AccountRole, address, type Instruction } from '@solana/kit'
import { PublicKey, Transaction } from '@solana/web3.js'

import { getSharedConnection } from '../config/connection'

export interface ClaimFeeState {
  claiming: boolean
  claimSignature: string | null
  error: string | null
}

export interface UseClaimFeeResult extends ClaimFeeState {
  claimFee: () => Promise<void>
  reset: () => void
}

interface ClaimFeeInput {
  pairAddress: string
  positionAddress: string
  ownerAddress: string
}

/**
 * Hook to claim DLMM position fees.
 *
 * Uses the DLMM SDK to build claim-fee transactions, then sends them
 * via the mobile wallet adapter.
 */
export function useClaimFee(input: ClaimFeeInput | null): UseClaimFeeResult {
  const { sendTransactions } = useMobileWallet()
  const [state, setState] = useState<ClaimFeeState>({
    claiming: false,
    claimSignature: null,
    error: null,
  })

  const claimFee = useCallback(async () => {
    if (!input) return

    setState({ claiming: true, claimSignature: null, error: null })

    try {
      const connection = getSharedConnection()
      const dlmmPool = await DLMM.create(connection, new PublicKey(input.pairAddress))

      // Get the position to access positionData
      const position = await dlmmPool.getPosition(new PublicKey(input.positionAddress))

      const transactions = await dlmmPool.claimSwapFee({
        owner: new PublicKey(input.ownerAddress),
        position,
      })

      if (transactions.length === 0) {
        setState({ claiming: false, claimSignature: null, error: 'No fees to claim' })
        return
      }

      // Convert v1 TransactionInstruction → @solana/kit Instruction,
      // then simulate before sending to wallet.
      const signatures: string[] = []
      for (const tx of transactions) {
        const kitInstructions: Instruction[] = tx.instructions.map((ix) => ({
          programAddress: address(ix.programId.toBase58()),
          accounts: ix.keys.map((key) => ({
            address: address(key.pubkey.toBase58()),
            role: key.isSigner
              ? key.isWritable
                ? AccountRole.WRITABLE_SIGNER
                : AccountRole.READONLY_SIGNER
              : key.isWritable
                ? AccountRole.WRITABLE
                : AccountRole.READONLY,
          })),
          data: new Uint8Array(ix.data),
        }))

        // Simulate the same instructions via web3.js before prompting the wallet.
        const simTx = new Transaction().add(...tx.instructions)
        simTx.feePayer = tx.feePayer
        simTx.recentBlockhash = tx.recentBlockhash
        const sim = await connection.simulateTransaction(simTx)
        if (sim.value.err) {
          const logs = sim.value.logs?.join('\n') ?? ''
          throw new Error(`Simulation failed: ${JSON.stringify(sim.value.err)}${logs ? `\n${logs}` : ''}`)
        }

        const sig = await sendTransactions(kitInstructions)
        signatures.push(sig)
      }

      setState({
        claiming: false,
        claimSignature: signatures[signatures.length - 1] ?? null,
        error: null,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Claim failed'
      setState({ claiming: false, claimSignature: null, error: message })
      console.error('Claim fee failed:', err)
    }
  }, [input, sendTransactions])

  const reset = useCallback(() => {
    setState({ claiming: false, claimSignature: null, error: null })
  }, [])

  return { ...state, claimFee, reset }
}
