import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { WEBHOOK_HEADERS } from '@uptime/shared'

import { useSnackbar } from '../../../../hooks/useSnackbar'
import { Secret } from './SigningSecretDialog.styles'

interface SigningSecretDialogProps {
  secret: string | null
  onClose: () => void
}

export function SigningSecretDialog({ secret, onClose }: SigningSecretDialogProps) {
  const notify = useSnackbar()

  const handleCopy = () => {
    if (!secret) return
    navigator.clipboard
      .writeText(secret)
      .then(() => notify('Signing secret copied'))
      .catch(() => notify('Copying was blocked; select the secret and copy it instead', 'error'))
  }

  return (
    <Dialog open={secret !== null} onClose={onClose} maxWidth="sm">
      <DialogTitle>Signing secret</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Every delivery carries an <code>{WEBHOOK_HEADERS.signature}</code> header: an HMAC-SHA256
          of the timestamp and the body, keyed with this secret. Check it to know an alert really
          came from here.
        </DialogContentText>
        <Secret>{secret}</Secret>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<ContentCopyRounded />} onClick={handleCopy}>
          Copy
        </Button>
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}
