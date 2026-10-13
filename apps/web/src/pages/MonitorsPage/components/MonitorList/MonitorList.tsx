import type { MonitorSummary } from '@uptime/shared'

import { SectionCard } from '../../../../components'
import { MonitorRow } from '../MonitorRow/MonitorRow'
import { Header } from './MonitorList.styles'

interface MonitorListProps {
  monitors: MonitorSummary[]
}

export function MonitorList({ monitors }: MonitorListProps) {
  return (
    <SectionCard padding="none">
      <Header aria-hidden="true">
        <span>Status</span>
        <span>Monitor</span>
        <span>Last 24 hours</span>
        <span>Uptime 24h</span>
        <span>Response</span>
        <span>Last checked</span>
      </Header>
      {monitors.map((monitor) => (
        <MonitorRow key={monitor.id} monitor={monitor} />
      ))}
    </SectionCard>
  )
}
