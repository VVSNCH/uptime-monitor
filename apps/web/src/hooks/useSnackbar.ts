import { useContext } from 'react'

import { type Notify, SnackbarContext } from '../context/snackbarContext'

export function useSnackbar(): Notify {
  const notify = useContext(SnackbarContext)
  if (!notify) throw new Error('useSnackbar must be used inside SnackbarProvider')
  return notify
}
