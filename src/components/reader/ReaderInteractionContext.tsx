import { createContext, type ReactNode, useContext } from 'react'

const ReaderInteractionContext = createContext(false)

export function ReaderInteractionProvider({ children, suspended }: { children: ReactNode; suspended: boolean }) {
  return <ReaderInteractionContext.Provider value={suspended}>{children}</ReaderInteractionContext.Provider>
}

export function useReaderInteractionSuspended(): boolean {
  return useContext(ReaderInteractionContext)
}
