import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import type { ReactNode } from 'react'

export type ConfirmDialogTone = 'default' | 'danger'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  tone?: ConfirmDialogTone
  isConfirming?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'default',
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={isConfirming ? undefined : onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={isConfirming}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={tone === 'danger' ? 'error' : 'primary'}
          onClick={onConfirm}
          loading={isConfirming}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
