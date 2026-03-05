const INITIAL_DEPOSITS_KEY = 'initial_deposits'

export function getInitialDepositsKey(positionAddress: string): string {
  return `${INITIAL_DEPOSITS_KEY}:${positionAddress}`
}

export function isInitialDepositsKey(key: string): boolean {
  return key.startsWith(INITIAL_DEPOSITS_KEY + ':')
}
