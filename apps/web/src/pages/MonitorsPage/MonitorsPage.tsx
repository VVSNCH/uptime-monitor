import AddRounded from '@mui/icons-material/AddRounded'
import MonitorHeartRounded from '@mui/icons-material/MonitorHeartRounded'
import Button from '@mui/material/Button'
import type { CreateMonitorRequest } from '@uptime/shared'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import {
  EmptyState,
  ErrorState,
  LoadingState,
  MonitorFormDialog,
  PageHeader,
} from '../../components'
import { ROUTES } from '../../constants/navigation'
import { useIncidents } from '../../hooks/useIncidents'
import { useCreateMonitor, useMonitors } from '../../hooks/useMonitors'
import { useSnackbar } from '../../hooks/useSnackbar'
import { MonitorList } from './components/MonitorList/MonitorList'
import { SummaryBar } from './components/SummaryBar/SummaryBar'
import { Stack } from './MonitorsPage.styles'

export function MonitorsPage() {
  const { data: monitors, isPending, isError, refetch } = useMonitors()
  const { data: openIncidents = [] } = useIncidents(true)
  const createMonitor = useCreateMonitor()
  const notify = useSnackbar()
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)

  const handleOpen = () => setIsCreating(true)
  const handleClose = () => {
    setIsCreating(false)
    createMonitor.reset()
  }
  const handleCreate = (request: CreateMonitorRequest) =>
    createMonitor.mutate(request, {
      onSuccess: (monitor) => {
        setIsCreating(false)
        notify(`${monitor.name} added. Its first check runs in a few seconds.`)
        void navigate(ROUTES.monitor(monitor.id))
      },
    })

  const addButton = (
    <Button variant="contained" startIcon={<AddRounded />} onClick={handleOpen}>
      Add monitor
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Monitors"
        description="Every URL you watch, and how it is doing."
        actions={monitors && monitors.length > 0 && addButton}
      />

      {isPending && (
        <Stack>
          <LoadingState variant="cards" count={4} />
          <LoadingState variant="list" count={4} />
        </Stack>
      )}

      {/* An empty list here would read as "everything is fine". */}
      {isError && (
        <ErrorState
          title="Service unavailable"
          message="The dashboard cannot reach the api right now."
          onRetry={() => void refetch()}
        />
      )}

      {monitors?.length === 0 && (
        <EmptyState
          icon={<MonitorHeartRounded />}
          title="No monitors yet"
          description="Add a URL and it will be checked on a schedule, with an alert when it goes down."
          action={addButton}
        />
      )}

      {monitors && monitors.length > 0 && (
        <Stack>
          <SummaryBar monitors={monitors} openIncidentCount={openIncidents.length} />
          <MonitorList monitors={monitors} />
        </Stack>
      )}

      {isCreating && (
        <MonitorFormDialog
          open
          isSubmitting={createMonitor.isPending}
          error={createMonitor.error?.message ?? null}
          onSubmit={handleCreate}
          onClose={handleClose}
        />
      )}
    </>
  )
}
