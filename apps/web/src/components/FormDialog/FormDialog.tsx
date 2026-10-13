import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogTitle from '@mui/material/DialogTitle'
import type { FormEvent, ReactNode } from 'react'

import { Fields } from './FormDialog.styles'

export type FormDialogSize = 'small' | 'medium'

interface FormDialogProps {
  open: boolean
  title: string
  submitLabel: string
  isSubmitting?: boolean
  error?: string | null
  size?: FormDialogSize
  onSubmit: () => void
  onClose: () => void
  children: ReactNode
}

const MAX_WIDTH: Record<FormDialogSize, 'xs' | 'sm'> = { small: 'xs', medium: 'sm' }

export function FormDialog({
  open,
  title,
  submitLabel,
  isSubmitting = false,
  error = null,
  size = 'small',
  onSubmit,
  onClose,
  children,
}: FormDialogProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} maxWidth={MAX_WIDTH[size]}>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{title}</DialogTitle>
        <Fields>
          {error && <Alert severity="error">{error}</Alert>}
          {children}
        </Fields>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            {submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
