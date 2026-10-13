import Tooltip from '@mui/material/Tooltip'

import { useNow } from '../../hooks/useNow'
import { useTimeZone } from '../../hooks/useTimeZone'
import { formatDateTime, formatRelative } from '../../services/format'

export type DateTimeVariant = 'absolute' | 'relative'

interface DateTimeProps {
  value: string
  variant?: DateTimeVariant
}

// Every timestamp in the interface goes through here, so the UTC or local
// time setting applies everywhere at once.
export function DateTime({ value, variant = 'absolute' }: DateTimeProps) {
  const [timeZone] = useTimeZone()
  const now = useNow()
  const absolute = formatDateTime(value, timeZone)

  if (variant === 'absolute') return <time dateTime={value}>{absolute}</time>

  return (
    <Tooltip title={absolute}>
      <time dateTime={value}>{formatRelative(value, now)}</time>
    </Tooltip>
  )
}
