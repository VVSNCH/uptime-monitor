import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { PASSWORD_RULES } from '@uptime/shared'
import { type FormEvent, useState } from 'react'

import { useChangePassword } from '../../../../hooks/useAccount'
import { useSnackbar } from '../../../../hooks/useSnackbar'
import { validateNewPassword } from '../../../../services/validation'
import { Form } from './PasswordForm.styles'

export function PasswordForm() {
  const changePassword = useChangePassword()
  const notify = useSnackbar()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isTouched, setIsTouched] = useState(false)

  const newPasswordError = isTouched ? validateNewPassword(newPassword) : null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setIsTouched(true)
    if (currentPassword === '' || validateNewPassword(newPassword) !== null) return
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('')
          setNewPassword('')
          setIsTouched(false)
          notify('Password changed. Every other session has been signed out.')
        },
      },
    )
  }

  return (
    <Form onSubmit={handleSubmit} noValidate>
      {changePassword.error && <Alert severity="error">{changePassword.error.message}</Alert>}
      <TextField
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        error={isTouched && currentPassword === ''}
        helperText={isTouched && currentPassword === '' ? 'Enter your current password' : null}
        onChange={(event) => setCurrentPassword(event.target.value)}
      />
      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        value={newPassword}
        error={newPasswordError !== null}
        helperText={newPasswordError ?? `At least ${PASSWORD_RULES.minLength} characters`}
        onChange={(event) => setNewPassword(event.target.value)}
        onBlur={() => setIsTouched(true)}
      />
      <div>
        <Button type="submit" variant="contained" loading={changePassword.isPending}>
          Change password
        </Button>
      </div>
    </Form>
  )
}
