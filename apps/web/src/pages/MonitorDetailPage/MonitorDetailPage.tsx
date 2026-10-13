import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import PauseRounded from '@mui/icons-material/PauseRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import type { CreateMonitorRequest, MonitorDetail } from '@uptime/shared'
import { useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router'

import {
  ConfirmDialog,
  DateTime,
  EmptyState,
  ErrorState,
  IncidentList,
  LoadingState,
  MonitorFormDialog,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
} from '../../components'
import { UPTIME_WINDOWS } from '../../constants/monitor'
import { ROUTES } from '../../constants/navigation'
import { useMonitorIncidents } from '../../hooks/useIncidents'
import {
  useCheckNow,
  useDeleteMonitor,
  useMonitor,
  useSetMonitorPaused,
  useUpdateMonitor,
} from '../../hooks/useMonitors'
import { useSnackbar } from '../../hooks/useSnackbar'
import { toDisplayStatus } from '../../services/monitorStatus'
import { MonitorSettings } from './components/MonitorSettings/MonitorSettings'
import { ResponseTimeChart } from './components/ResponseTimeChart/ResponseTimeChart'
import { UptimeHistory } from './components/UptimeHistory/UptimeHistory'
import { UptimeStatCard } from './components/UptimeStatCard/UptimeStatCard'
import { BackLink, Column, Columns, Stack, Stats } from './MonitorDetailPage.styles'

const notFound = (
  <ErrorState title="Monitor not found" message="It may have been deleted, or the link is wrong." />
)

export function MonitorDetailPage() {
  const id = Number(useParams().id)
  return Number.isInteger(id) ? <MonitorLoader id={id} /> : notFound
}

function MonitorLoader({ id }: { id: number }) {
  const { data: monitor, isPending, isError, error, refetch } = useMonitor(id)

  if (error?.statusCode === 404) return notFound
  if (isPending) return <LoadingState variant="detail" />
  if (isError) {
    return (
      <ErrorState
        title="Service unavailable"
        message="This monitor could not be loaded right now."
        onRetry={() => void refetch()}
      />
    )
  }
  return <MonitorDetailView monitor={monitor} />
}

interface MonitorDetailViewProps {
  monitor: MonitorDetail
}

function MonitorDetailView({ monitor }: MonitorDetailViewProps) {
  const navigate = useNavigate()
  const notify = useSnackbar()
  const { data: incidents = [] } = useMonitorIncidents(monitor.id)
  const checkNow = useCheckNow(monitor.id)
  const setPaused = useSetMonitorPaused(monitor.id)
  const updateMonitor = useUpdateMonitor(monitor.id)
  const deleteMonitor = useDeleteMonitor(monitor.id)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const status = toDisplayStatus(monitor)
  const isPaused = status === 'paused'

  const handleCheckNow = () =>
    checkNow.mutate(undefined, {
      onSuccess: () => notify('Check queued. The result appears here in a few seconds.', 'info'),
      onError: (error) => notify(error.message, 'error'),
    })

  const handleTogglePaused = () =>
    setPaused.mutate(!isPaused, {
      onSuccess: () =>
        notify(isPaused ? 'Checks resumed' : 'Paused. No checks or alerts until resumed.'),
      onError: (error) => notify(error.message, 'error'),
    })

  const handleEditClose = () => {
    setIsEditing(false)
    updateMonitor.reset()
  }
  const handleSave = (request: CreateMonitorRequest) =>
    updateMonitor.mutate(request, {
      onSuccess: () => {
        setIsEditing(false)
        notify('Changes saved')
      },
    })

  const handleDelete = () =>
    deleteMonitor.mutate(undefined, {
      onSuccess: () => {
        notify(`${monitor.name} deleted`)
        void navigate(ROUTES.monitors)
      },
      onError: (error) => notify(error.message, 'error'),
    })

  return (
    <>
      <BackLink>
        <Button
          component={RouterLink}
          to={ROUTES.monitors}
          startIcon={<ArrowBackRounded />}
          size="small"
        >
          All monitors
        </Button>
      </BackLink>

      <PageHeader
        title={monitor.name}
        description={
          <Link href={monitor.url} target="_blank" rel="noreferrer" color="inherit">
            {monitor.url}
          </Link>
        }
        actions={
          <>
            <Button
              variant="contained"
              startIcon={<RefreshRounded />}
              onClick={handleCheckNow}
              loading={checkNow.isPending}
              disabled={isPaused}
            >
              Check now
            </Button>
            <Button
              variant="outlined"
              startIcon={isPaused ? <PlayArrowRounded /> : <PauseRounded />}
              onClick={handleTogglePaused}
              loading={setPaused.isPending}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button color="error" onClick={() => setIsDeleting(true)}>
              Delete
            </Button>
          </>
        }
      />

      <Stack>
        {monitor.isSeeded && (
          <Alert severity="info">
            Demo monitor: its history before it was seeded was generated, not measured.
          </Alert>
        )}

        <Stats>
          <StatCard
            label="Status"
            value={<StatusBadge status={status} variant="inline" size="medium" />}
            hint={
              monitor.lastCheckedAt ? (
                <>
                  Last checked <DateTime value={monitor.lastCheckedAt} variant="relative" />
                </>
              ) : (
                'Not checked yet'
              )
            }
          />
          {UPTIME_WINDOWS.map((window) => (
            <UptimeStatCard
              key={window.value}
              monitorId={monitor.id}
              window={window.value}
              label={window.label}
            />
          ))}
        </Stats>

        <Columns>
          <Column>
            <UptimeHistory monitorId={monitor.id} />
            <ResponseTimeChart monitorId={monitor.id} />
          </Column>

          <Column>
            <SectionCard title="Incidents" padding={incidents.length > 0 ? 'none' : 'normal'}>
              {incidents.length > 0 ? (
                <IncidentList incidents={incidents} variant="monitor" />
              ) : (
                <EmptyState
                  variant="inline"
                  title="No incidents"
                  description="Outages of this monitor will be listed here, with how long they lasted."
                />
              )}
            </SectionCard>
            <MonitorSettings monitor={monitor} onEdit={() => setIsEditing(true)} />
          </Column>
        </Columns>
      </Stack>

      {isEditing && (
        <MonitorFormDialog
          open
          monitor={monitor}
          isSubmitting={updateMonitor.isPending}
          error={updateMonitor.error?.message ?? null}
          onSubmit={handleSave}
          onClose={handleEditClose}
        />
      )}

      <ConfirmDialog
        open={isDeleting}
        title={`Delete ${monitor.name}?`}
        message="Its checks, incidents and history are deleted with it. This cannot be undone."
        confirmLabel="Delete monitor"
        tone="danger"
        isConfirming={deleteMonitor.isPending}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleting(false)}
      />
    </>
  )
}
