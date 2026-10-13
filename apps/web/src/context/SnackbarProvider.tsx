import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { type ReactNode, useCallback, useState } from 'react'

import { SNACKBAR_DURATION_MS } from '../constants/layout'
import { type Notify, SnackbarContext, type SnackbarTone } from './snackbarContext'

interface SnackbarProviderProps {
  children: ReactNode
}

interface Message {
  key: number
  text: string
  tone: SnackbarTone
}

// One message at a time: a newer one replaces the one on screen.
export function SnackbarProvider({ children }: SnackbarProviderProps) {
  const [message, setMessage] = useState<Message | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const notify = useCallback<Notify>((text, tone = 'success') => {
    setMessage({ key: Date.now(), text, tone })
    setIsOpen(true)
  }, [])

  const handleClose = () => setIsOpen(false)

  return (
    <SnackbarContext value={notify}>
      {children}
      <Snackbar
        key={message?.key}
        open={isOpen}
        autoHideDuration={SNACKBAR_DURATION_MS}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={message?.tone ?? 'info'} variant="filled" onClose={handleClose}>
          {message?.text}
        </Alert>
      </Snackbar>
    </SnackbarContext>
  )
}
