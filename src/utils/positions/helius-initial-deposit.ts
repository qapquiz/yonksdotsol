export interface InitialDeposit {
  tokenMint: string
  amount: number
  decimals: number
  uiAmount: number
}

export interface PositionInitialDeposit {
  owner: string
  position: string
  initialDeposits: InitialDeposit[]
  nativeSolDeposits: number
  creationTx: string
}

interface EnhancedTransaction {
  type: string
  description: string
  source: string
  accountData: AccountData[]
  tokenTransfers: TokenTransfer[]
  nativeTransfers: NativeTransfer[]
  timestamp: number
  slot: number
  signature: string
}

interface AccountData {
  account: string
  nativeBalanceChange: number
  tokenBalanceChanges: TokenBalanceChange[]
}

interface TokenBalanceChange {
  mint: string
  owner: string
  tokenAmount: {
    amount: string
    decimals: number
    uiAmount: number
    uiAmountString: string
  }
}

interface TokenTransfer {
  fromUserAccount: string
  toUserAccount: string
  fromTokenAccount: string
  toTokenAccount: string
  tokenAmount: number
  mint: string
}

interface NativeTransfer {
  fromUserAccount: string
  toUserAccount: string
  amount: number
}

const DLMM_TRANSACTION_TYPES = [
  'ADD_LIQUIDITY',
  'ADD_LIQUIDITY_ONE_SIDE',
  'ADD_LIQUIDITY_BY_STRATEGY',
  'ADD_LIQUIDITY_ONE_SIDE_PRECISE',
  'TRANSFER',
]

async function getEnhancedTransactions(
  address: string,
  apiKey: string,
  before?: string,
): Promise<EnhancedTransaction[]> {
  const params = new URLSearchParams({
    'api-key': apiKey,
    limit: '100',
  })

  if (before) params.set('before-signature', before)

  const response = await fetch(
    `https://api-mainnet.helius-rpc.com/v0/addresses/${address}/transactions?${params.toString()}`,
  )

  if (!response.ok) {
    throw new Error(`Helius API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data as EnhancedTransaction[]
}

export async function getPositionInitialDepositHeliusEnhanced(
  positionAddress: string,
  ownerAddress: string,
  apiKey: string,
): Promise<PositionInitialDeposit> {
  console.log('getPositionInitialDepositHeliusEnhanced called with:', {
    positionAddress,
    ownerAddress,
  })

  const deposits = new Map<string, number>()
  const decimalsMap = new Map<string, number>()
  let nativeSolDeposits = 0

  let before: string | undefined = undefined
  let firstSignature = ''
  let totalTxFetched = 0

  while (true) {
    const transactions = await getEnhancedTransactions(positionAddress, apiKey, before)

    if (!transactions || transactions.length === 0) {
      break
    }

    totalTxFetched += transactions.length
    console.log(`Fetched ${transactions.length} transactions, total: ${totalTxFetched}`)

    if (!firstSignature && transactions[0]) {
      firstSignature = transactions[0].signature
    }

    const liquidityTransactions = transactions.filter((tx) => DLMM_TRANSACTION_TYPES.includes(tx.type))

    for (const tx of liquidityTransactions) {
      for (const tokenTransfer of tx.tokenTransfers || []) {
        if (tokenTransfer.fromUserAccount === ownerAddress) {
          const amount = tokenTransfer.tokenAmount
          const mint = tokenTransfer.mint
          deposits.set(mint, (deposits.get(mint) || 0) + amount * Math.pow(10, 9))
          decimalsMap.set(mint, 9)
        }
      }

      for (const nativeTransfer of tx.nativeTransfers || []) {
        if (nativeTransfer.fromUserAccount === ownerAddress) {
          const amount = nativeTransfer.amount
          if (amount > 10000000 && amount < 100000000) {
            nativeSolDeposits += amount
          }
        }
      }
    }

    if (transactions.length > 0) {
      const lastTx = transactions[transactions.length - 1]
      if (lastTx) {
        before = lastTx.signature
      }
    }

    if (transactions.length < 100) {
      break
    }
  }

  console.log('Finished fetching transactions:', {
    totalTransactions: totalTxFetched,
    liquidityTransactionsFound: totalTxFetched,
  })

  const initialDeposits: InitialDeposit[] = []

  for (const [mint, amount] of deposits.entries()) {
    if (amount > 0) {
      const decimals = decimalsMap.get(mint) || 0
      initialDeposits.push({
        tokenMint: mint,
        amount: amount,
        decimals: decimals,
        uiAmount: amount / Math.pow(10, decimals),
      })
    }
  }

  const result = {
    owner: ownerAddress,
    position: positionAddress,
    initialDeposits,
    nativeSolDeposits,
    creationTx: firstSignature,
  }

  const totalTokenValue = initialDeposits.reduce((sum, deposit) => sum + deposit.uiAmount, 0)

  console.log('Initial deposits result:', {
    positionAddress,
    initialDeposits,
    totalTokenValue: `$${totalTokenValue.toFixed(2)}`,
    nativeSolDepositsExcluded: true,
    creationTx: firstSignature,
  })

  return result
}
