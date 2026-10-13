import AddRounded from '@mui/icons-material/AddRounded'
import CampaignRounded from '@mui/icons-material/CampaignRounded'
import Button from '@mui/material/Button'
import type { ChannelResponse, CreateChannelRequest } from '@uptime/shared'
import { useState } from 'react'

import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionCard,
} from '../../components'
import {
  useChannels,
  useCreateChannel,
  useDeleteChannel,
  useTestChannel,
  useUpdateChannel,
} from '../../hooks/useChannels'
import { useSnackbar } from '../../hooks/useSnackbar'
import { ChannelFormDialog } from './components/ChannelFormDialog/ChannelFormDialog'
import { ChannelRow } from './components/ChannelRow/ChannelRow'
import { SigningSecretDialog } from './components/SigningSecretDialog/SigningSecretDialog'

export function ChannelsPage() {
  const { data: channels, isPending, isError, refetch } = useChannels()
  const createChannel = useCreateChannel()
  const updateChannel = useUpdateChannel()
  const deleteChannel = useDeleteChannel()
  const testChannel = useTestChannel()
  const notify = useSnackbar()

  const [isCreating, setIsCreating] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<ChannelResponse | null>(null)

  const handleCreateClose = () => {
    setIsCreating(false)
    createChannel.reset()
  }
  const handleCreate = (request: CreateChannelRequest) =>
    createChannel.mutate(request, {
      onSuccess: (channel) => {
        setIsCreating(false)
        notify('Channel added. Send a test to make sure it works.')
        if (channel.signingSecret) setSecret(channel.signingSecret)
      },
    })

  // A channel nobody has tested is a channel nobody has, so the result is
  // reported in full, including what the receiver answered.
  const handleTest = (channel: ChannelResponse) =>
    testChannel.mutate(channel.id, {
      onSuccess: (result) => {
        if (result.delivered) {
          notify(`Test delivered${result.statusCode ? ` (HTTP ${result.statusCode})` : ''}`)
        } else {
          notify(`Test failed: ${result.error ?? 'no answer'}`, 'error')
        }
      },
      onError: (error) => notify(error.message, 'error'),
    })

  const handleToggle = (channel: ChannelResponse, isEnabled: boolean) =>
    updateChannel.mutate(
      { id: channel.id, enabled: isEnabled },
      {
        onSuccess: () =>
          notify(isEnabled ? 'Channel enabled' : 'Channel disabled. It keeps its settings.'),
        onError: (error) => notify(error.message, 'error'),
      },
    )

  const handleDelete = () => {
    if (!toDelete) return
    deleteChannel.mutate(toDelete.id, {
      onSuccess: () => {
        setToDelete(null)
        notify('Channel deleted')
      },
      onError: (error) => notify(error.message, 'error'),
    })
  }

  const addButton = (
    <Button variant="contained" startIcon={<AddRounded />} onClick={() => setIsCreating(true)}>
      Add channel
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Notification channels"
        description="Where alerts go. Every enabled channel hears about every monitor."
        actions={channels && channels.length > 0 && addButton}
      />

      {isPending && <LoadingState variant="list" count={3} />}

      {isError && (
        <ErrorState
          title="Service unavailable"
          message="Channels could not be loaded right now."
          onRetry={() => void refetch()}
        />
      )}

      {channels?.length === 0 && (
        <EmptyState
          icon={<CampaignRounded />}
          title="No channels yet"
          description="Add a Slack webhook or an email address to be told when something goes down, and when it recovers."
          action={addButton}
        />
      )}

      {channels && channels.length > 0 && (
        <SectionCard padding="none">
          {channels.map((channel) => (
            <ChannelRow
              key={channel.id}
              channel={channel}
              isTesting={testChannel.isPending && testChannel.variables === channel.id}
              onTest={() => handleTest(channel)}
              onToggle={(isEnabled) => handleToggle(channel, isEnabled)}
              onShowSecret={() => setSecret(channel.signingSecret)}
              onDelete={() => setToDelete(channel)}
            />
          ))}
        </SectionCard>
      )}

      {isCreating && (
        <ChannelFormDialog
          open
          isSubmitting={createChannel.isPending}
          error={createChannel.error?.message ?? null}
          onSubmit={handleCreate}
          onClose={handleCreateClose}
        />
      )}

      <SigningSecretDialog secret={secret} onClose={() => setSecret(null)} />

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this channel?"
        message={`Alerts will stop going to ${toDelete?.target ?? 'it'}. To pause them instead, switch the channel off.`}
        confirmLabel="Delete channel"
        tone="danger"
        isConfirming={deleteChannel.isPending}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}
