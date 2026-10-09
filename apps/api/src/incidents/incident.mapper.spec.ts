import { toIncidentResponse } from './incident.mapper.js'
import type { IncidentWithMonitor } from './incidents.repository.js'

const incident = (overrides: Partial<IncidentWithMonitor> = {}): IncidentWithMonitor => ({
  id: 3,
  monitorId: 7,
  startedAt: new Date('2026-10-08T14:40:00Z'),
  endedAt: new Date('2026-10-08T14:46:30Z'),
  cause: 'HTTP 502',
  monitor: { name: 'Payments API' },
  ...overrides,
})

describe('toIncidentResponse', () => {
  it('reports how long a closed incident lasted, in seconds', () => {
    expect(toIncidentResponse(incident())).toEqual({
      id: 3,
      monitorId: 7,
      monitorName: 'Payments API',
      startedAt: '2026-10-08T14:40:00.000Z',
      endedAt: '2026-10-08T14:46:30.000Z',
      durationSeconds: 390,
      cause: 'HTTP 502',
    })
  })

  it('leaves the end and duration empty while the incident is open', () => {
    expect(toIncidentResponse(incident({ endedAt: null }))).toMatchObject({
      endedAt: null,
      durationSeconds: null,
    })
  })
})
