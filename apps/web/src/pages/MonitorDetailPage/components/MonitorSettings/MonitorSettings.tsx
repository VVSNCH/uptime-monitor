import Button from '@mui/material/Button'
import type { MonitorDetail } from '@uptime/shared'

import { DateTime, SectionCard } from '../../../../components'
import { INTERVAL_OPTIONS } from '../../../../constants/monitor'
import { Details, Term, Value } from './MonitorSettings.styles'

interface MonitorSettingsProps {
  monitor: MonitorDetail
  onEdit: () => void
}

export function MonitorSettings({ monitor, onEdit }: MonitorSettingsProps) {
  const interval =
    INTERVAL_OPTIONS.find((option) => option.value === monitor.intervalSeconds)?.label ??
    `Every ${monitor.intervalSeconds} seconds`

  return (
    <SectionCard
      title="Settings"
      actions={
        <Button size="small" onClick={onEdit}>
          Edit
        </Button>
      }
    >
      <Details>
        <Term>Method</Term>
        <Value>{monitor.method}</Value>
        <Term>Checked</Term>
        <Value>{interval}</Value>
        <Term>Timeout</Term>
        <Value>{monitor.timeoutMs} ms</Value>
        <Term>Expects</Term>
        <Value>
          {monitor.expectedStatus === null ? 'Any 2xx' : `HTTP ${monitor.expectedStatus}`}
        </Value>
        <Term>Down after</Term>
        <Value>{monitor.failureThreshold} failed checks in a row</Value>
        <Term>Added</Term>
        <Value>
          <DateTime value={monitor.createdAt} />
        </Value>
      </Details>
    </SectionCard>
  )
}
