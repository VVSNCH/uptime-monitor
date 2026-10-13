import { createContext } from 'react'

export type SnackbarTone = 'success' | 'error' | 'info'

export type Notify = (message: string, tone?: SnackbarTone) => void

export const SnackbarContext = createContext<Notify | null>(null)
