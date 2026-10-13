import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import EmailRounded from '@mui/icons-material/EmailRounded'
import KeyRounded from '@mui/icons-material/KeyRounded'
import WebhookRounded from '@mui/icons-material/WebhookRounded'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { CHANNEL_TYPE, type ChannelResponse } from '@uptime/shared'

import { Actions, Details, Icon, Row } from './ChannelRow.styles'

interface ChannelRowProps {
  channel: ChannelResponse
  isTesting: boolean
  onTest: () => void
  onToggle: (isEnabled: boolean) => void
  onShowSecret: () => void
  onDelete: () => void
}

export function ChannelRow({
  channel,
  isTesting,
  onTest,
  onToggle,
  onShowSecret,
  onDelete,
}: ChannelRowProps) {
  const isWebhook = channel.type === CHANNEL_TYPE.webhook

  return (
    <Row $isMuted={!channel.enabled}>
      <Icon>{isWebhook ? <WebhookRounded /> : <EmailRounded />}</Icon>
      <Details>
        <Typography variant="subtitle2" noWrap>
          {channel.target}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {isWebhook ? 'Webhook' : 'Email'} · {describeEvents(channel)}
        </Typography>
      </Details>
      <Actions>
        <Tooltip title={channel.enabled ? 'Enabled' : 'Disabled'}>
          <Switch
            checked={channel.enabled}
            onChange={(_event, value) => onToggle(value)}
            slotProps={{ input: { 'aria-label': 'Enabled' } }}
          />
        </Tooltip>
        <Button size="small" variant="outlined" onClick={onTest} loading={isTesting}>
          Send test
        </Button>
        {isWebhook && (
          <Tooltip title="Signing secret">
            <IconButton aria-label="Show signing secret" onClick={onShowSecret}>
              <KeyRounded />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Delete">
          <IconButton aria-label="Delete channel" onClick={onDelete}>
            <DeleteOutlineRounded />
          </IconButton>
        </Tooltip>
      </Actions>
    </Row>
  )
}

function describeEvents(channel: ChannelResponse): string {
  if (channel.sendOnDown && channel.sendOnRecover) return 'down and recovery alerts'
  if (channel.sendOnDown) return 'down alerts only'
  if (channel.sendOnRecover) return 'recovery alerts only'
  return 'no alerts selected'
}
