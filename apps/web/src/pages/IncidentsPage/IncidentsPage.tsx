import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { useState } from 'react'

import {
  EmptyState,
  ErrorState,
  IncidentList,
  LoadingState,
  PageHeader,
  SectionCard,
} from '../../components'
import { useIncidents } from '../../hooks/useIncidents'

export function IncidentsPage() {
  const [isOpenOnly, setIsOpenOnly] = useState(false)
  const { data: incidents, isPending, isError, refetch } = useIncidents(isOpenOnly)

  return (
    <>
      <PageHeader
        title="Incidents"
        description="Every outage across your monitors, newest first."
        actions={
          <FormControlLabel
            control={
              <Switch checked={isOpenOnly} onChange={(_event, value) => setIsOpenOnly(value)} />
            }
            label="Open only"
          />
        }
      />

      {isPending && <LoadingState variant="list" count={5} />}

      {isError && (
        <ErrorState
          title="Service unavailable"
          message="Incidents could not be loaded right now."
          onRetry={() => void refetch()}
        />
      )}

      {incidents?.length === 0 && (
        <EmptyState
          icon={<CheckCircleOutlineRounded color="success" />}
          title={isOpenOnly ? 'Nothing is down' : 'No incidents yet'}
          description={
            isOpenOnly
              ? 'Every monitor answered its last checks.'
              : 'When a monitor fails two checks in a row, the outage is recorded here with how long it lasted.'
          }
        />
      )}

      {incidents && incidents.length > 0 && (
        <SectionCard padding="none">
          <IncidentList incidents={incidents} />
        </SectionCard>
      )}
    </>
  )
}
