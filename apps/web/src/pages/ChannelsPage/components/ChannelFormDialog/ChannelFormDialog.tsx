import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { CHANNEL_TYPE, type ChannelType, type CreateChannelRequest } from '@uptime/shared'
import { useState } from 'react'

import { FormDialog } from '../../../../components'
import { validateEmail, validateUrl } from '../../../../services/validation'

const TARGET_FIELD: Record<ChannelType, { label: string; placeholder: string; hint: string }> = {
  EMAIL: {
    label: 'Email address',
    placeholder: 'oncall@example.com',
    hint: 'Alerts are sent here',
  },
  WEBHOOK: {
    label: 'Webhook URL',
    placeholder: 'https://hooks.slack.com/services/â€¦',
    hint: 'A Slack incoming webhook works as it is',
  },
}

interface ChannelFormDialogProps {
  open: boolean
  isSubmitting: boolean
  error: string | null
  onSubmit: (request: CreateChannelRequest) => void
  onClose: () => void
}

export function ChannelFormDialog({
  open,
  isSubmitting,
  error,
  onSubmit,
  onClose,
}: ChannelFormDialogProps) {
  const [type, setType] = useState<ChannelType>(CHANNEL_TYPE.webhook)
  const [target, setTarget] = useState('')
  const [isTouched, setIsTouched] = useState(false)
  const [shouldSendOnDown, setShouldSendOnDown] = useState(true)
  const [shouldSendOnRecover, setShouldSendOnRecover] = useState(true)

  const validate = type === CHANNEL_TYPE.email ? validateEmail : validateUrl
  const targetError = isTouched ? validate(target) : null
  const field = TARGET_FIELD[type]

  const handleSubmit = () => {
    setIsTouched(true)
    if (validate(target) !== null) return
    onSubmit({
      type,
      target: target.trim(),
      sendOnDown: shouldSendOnDown,
      sendOnRecover: shouldSendOnRecover,
    })
  }

  return (
    <FormDialog
      open={open}
      title="Add channel"
      submitLabel="Add channel"
      isSubmitting={isSubmitting}
      error={error}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextField
        select
        label="Type"
        value={type}
        onChange={(event) => setType(event.target.value as ChannelType)}
      >
        <MenuItem value={CHANNEL_TYPE.webhook}>
          Webhook (Slack, Discord, your own endpoint)
        </MenuItem>
        <MenuItem value={CHANNEL_TYPE.email}>Email</MenuItem>
      </TextField>
      <TextField
        label={field.label}
        placeholder={field.placeholder}
        value={target}
        error={targetError !== null}
        helperText={targetError ?? field.hint}
        onChange={(event) => setTarget(event.target.value)}
        onBlur={() => setIsTouched(true)}
      />
      <FormGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={shouldSendOnDown}
              onChange={(_event, value) => setShouldSendOnDown(value)}
            />
          }
          label="When a monitor goes down"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={shouldSendOnRecover}
              onChange={(_event, value) => setShouldSendOnRecover(value)}
            />
          }
          label="When it recovers"
        />
      </FormGroup>
    </FormDialog>
  )
}
