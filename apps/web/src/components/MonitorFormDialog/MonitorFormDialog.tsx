import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import type {
  CheckIntervalSeconds,
  CreateMonitorRequest,
  HttpMethod,
  MonitorDetail,
} from '@uptime/shared'
import { type ChangeEvent, useState } from 'react'

import { INTERVAL_OPTIONS, METHOD_OPTIONS, MONITOR_DEFAULTS } from '../../constants/monitor'
import {
  validateExpectedStatus,
  validateName,
  validateTimeout,
  validateUrl,
} from '../../services/validation'
import { FormDialog } from '../FormDialog/FormDialog'
import { Row } from './MonitorFormDialog.styles'

interface FormValues {
  name: string
  url: string
  method: HttpMethod
  intervalSeconds: CheckIntervalSeconds
  timeoutMs: string
  expectedStatus: string
}

type TextFieldName = 'name' | 'url' | 'timeoutMs' | 'expectedStatus'

const VALIDATORS: Record<TextFieldName, (value: string) => string | null> = {
  name: validateName,
  url: validateUrl,
  timeoutMs: validateTimeout,
  expectedStatus: validateExpectedStatus,
}

interface MonitorFormDialogProps {
  open: boolean
  // Edits this monitor when given, creates a new one otherwise.
  monitor?: MonitorDetail
  isSubmitting: boolean
  error: string | null
  onSubmit: (request: CreateMonitorRequest) => void
  onClose: () => void
}

export function MonitorFormDialog({
  open,
  monitor,
  isSubmitting,
  error,
  onSubmit,
  onClose,
}: MonitorFormDialogProps) {
  const [values, setValues] = useState<FormValues>(() => initialValues(monitor))
  const [touched, setTouched] = useState<Partial<Record<TextFieldName, boolean>>>({})
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // Errors show as soon as a field has been left, then update as it is typed in.
  const errorFor = (field: TextFieldName) =>
    touched[field] || hasSubmitted ? VALIDATORS[field](values[field]) : null

  const textProps = (field: TextFieldName) => ({
    value: values[field],
    error: errorFor(field) !== null,
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      setValues((current) => ({ ...current, [field]: event.target.value })),
    onBlur: () => setTouched((current) => ({ ...current, [field]: true })),
  })

  const handleSubmit = () => {
    setHasSubmitted(true)
    const fields = Object.keys(VALIDATORS) as TextFieldName[]
    if (fields.some((field) => VALIDATORS[field](values[field]) !== null)) return
    onSubmit({
      name: values.name.trim(),
      url: values.url.trim(),
      method: values.method,
      intervalSeconds: values.intervalSeconds,
      timeoutMs: Number(values.timeoutMs),
      expectedStatus: values.expectedStatus.trim() === '' ? null : Number(values.expectedStatus),
    })
  }

  return (
    <FormDialog
      open={open}
      title={monitor ? 'Edit monitor' : 'Add monitor'}
      submitLabel={monitor ? 'Save changes' : 'Add monitor'}
      size="medium"
      isSubmitting={isSubmitting}
      error={error}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextField
        label="Name"
        autoFocus
        placeholder="Payments API"
        helperText={errorFor('name')}
        {...textProps('name')}
      />
      <TextField
        label="URL"
        placeholder="https://api.example.com/health"
        helperText={errorFor('url') ?? 'The address that should answer with a 2xx status'}
        {...textProps('url')}
      />
      <Row>
        <TextField
          select
          label="Method"
          value={values.method}
          onChange={(event) =>
            setValues((current) => ({ ...current, method: event.target.value as HttpMethod }))
          }
        >
          {METHOD_OPTIONS.map((method) => (
            <MenuItem key={method} value={method}>
              {method}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Check"
          value={values.intervalSeconds}
          helperText={
            values.intervalSeconds === 60 ? 'Best kept for the endpoints that matter most' : ' '
          }
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              intervalSeconds: Number(event.target.value) as CheckIntervalSeconds,
            }))
          }
        >
          {INTERVAL_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Row>
      <Row>
        <TextField
          label="Timeout (ms)"
          type="number"
          helperText={errorFor('timeoutMs') ?? 'Slower than this counts as down'}
          {...textProps('timeoutMs')}
        />
        <TextField
          label="Expected status"
          type="number"
          placeholder="Any 2xx"
          helperText={errorFor('expectedStatus') ?? 'Optional'}
          {...textProps('expectedStatus')}
        />
      </Row>
    </FormDialog>
  )
}

function initialValues(monitor?: MonitorDetail): FormValues {
  return {
    name: monitor?.name ?? '',
    url: monitor?.url ?? '',
    method: monitor?.method ?? MONITOR_DEFAULTS.method,
    intervalSeconds: monitor?.intervalSeconds ?? MONITOR_DEFAULTS.intervalSeconds,
    timeoutMs: String(monitor?.timeoutMs ?? MONITOR_DEFAULTS.timeoutMs),
    expectedStatus: monitor?.expectedStatus == null ? '' : String(monitor.expectedStatus),
  }
}
