import { useQueryClient } from '@tanstack/react-query'
import { LIVE_EVENT_TYPES } from '@uptime/shared'
import { useEffect, useState } from 'react'

import { LIVE_STREAM } from '../constants/api'
import { QUERY_KEYS } from '../constants/query'
import { connectLiveEvents, type LiveStatus } from '../services/liveEvents'

// Keeps cached data in step with the server: each event marks what changed,
// and once a second the affected queries are refetched, so a burst of checks
// costs one round of requests rather than one per check.
export function useLiveUpdates(): LiveStatus {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<LiveStatus>('connecting')

  useEffect(() => {
    const changedMonitors = new Set<number>()
    let hasIncidentChange = false
    let flushTimer: ReturnType<typeof setTimeout> | undefined

    const flush = () => {
      flushTimer = undefined
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monitors, exact: true })
      for (const id of changedMonitors) {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monitor(id) })
      }
      if (hasIncidentChange) {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incidents })
      }
      changedMonitors.clear()
      hasIncidentChange = false
    }

    const disconnect = connectLiveEvents({
      onEvent: (event) => {
        changedMonitors.add(event.monitorId)
        if (event.type !== LIVE_EVENT_TYPES.monitorChecked) hasIncidentChange = true
        flushTimer ??= setTimeout(flush, LIVE_STREAM.batchMs)
      },
      onStatusChange: setStatus,
    })

    return () => {
      disconnect()
      clearTimeout(flushTimer)
    }
  }, [queryClient])

  return status
}
