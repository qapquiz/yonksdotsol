import { createContext, useContext, useState, type ReactNode } from 'react'

interface LoadingContextValue {
  isGlobalLoading: boolean
  setGlobalLoading: (loading: boolean) => void
}

const LoadingContext = createContext<LoadingContextValue | null>(null)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isGlobalLoading, setGlobalLoading] = useState(false)

  return <LoadingContext.Provider value={{ isGlobalLoading, setGlobalLoading }}>{children}</LoadingContext.Provider>
}

export function useGlobalLoading() {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useGlobalLoading must be used within LoadingProvider')
  }
  return context
}
