import { useEffect, useState } from 'react'

import { RELATIVE_TIME_TICK_MS } from '../constants/time'

// The current time, redrawn on a tick so "2 minutes ago" keeps moving.
export function useNow(tickMs = RELATIVE_TIME_TICK_MS): number {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), tickMs)
    return () => clearInterval(timer)
  }, [tickMs])

  return now
}
