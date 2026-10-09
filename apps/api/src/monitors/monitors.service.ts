import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import type { Monitor } from '@uptime/database'
import { AppException } from '@uptime/nest-common'
import {
  type CreateMonitorRequest,
  ERROR_CODES,
  MONITOR_LIMITS,
  type MonitorDetail,
  type MonitorSummary,
  type UpdateMonitorRequest,
} from '@uptime/shared'

import { MS_PER_DAY } from '../constants/index.js'
import { HistoryRepository } from '../history/history.repository.js'
import { summarize } from '../stats/stats.calculator.js'
import { toMonitorDetail, toMonitorSummary } from './monitor.mapper.js'
import { MonitorScheduleService } from './monitor-schedule.service.js'
import { MonitorsRepository } from './monitors.repository.js'

const DEFAULT_METHOD = 'GET'

@Injectable()
export class MonitorsService {
  constructor(
    @Inject(MonitorsRepository) private readonly monitors: MonitorsRepository,
    @Inject(MonitorScheduleService) private readonly schedule: MonitorScheduleService,
    @Inject(HistoryRepository) private readonly history: HistoryRepository,
  ) {}

  // One grouped query for the whole list, not one per monitor.
  async list(userId: number): Promise<MonitorSummary[]> {
    const now = new Date()
    const monitors = await this.monitors.listForUser(userId)
    const uptime = await this.uptime24h(
      monitors.map((monitor) => monitor.id),
      now,
    )
    return monitors.map((monitor) => toMonitorSummary(monitor, now, uptime(monitor.id)))
  }

  async get(userId: number, id: number): Promise<MonitorDetail> {
    return this.toDetail(requireFound(await this.monitors.findForUser(userId, id)))
  }

  async create(userId: number, request: CreateMonitorRequest): Promise<MonitorDetail> {
    const monitor = await this.monitors.create(userId, {
      name: request.name,
      url: request.url,
      method: request.method ?? DEFAULT_METHOD,
      intervalSeconds: request.intervalSeconds,
      timeoutMs: request.timeoutMs ?? MONITOR_LIMITS.timeoutMs.default,
      expectedStatus: request.expectedStatus ?? null,
      failureThreshold: request.failureThreshold ?? MONITOR_LIMITS.failureThreshold.default,
    })
    // A new scheduler queues its first run immediately, so the first result
    // appears in seconds without a separate one-off check.
    await this.schedule.sync(monitor)
    return toMonitorDetail(monitor, new Date())
  }

  async update(userId: number, id: number, request: UpdateMonitorRequest): Promise<MonitorDetail> {
    const monitor = requireFound(await this.monitors.updateForUser(userId, id, request))
    await this.schedule.sync(monitor)
    return this.toDetail(monitor)
  }

  async remove(userId: number, id: number): Promise<void> {
    const isDeleted = await this.monitors.deleteForUser(userId, id)
    if (!isDeleted) throw notFound()
    await this.schedule.unschedule(id)
  }

  async setPaused(userId: number, id: number, isPaused: boolean): Promise<MonitorDetail> {
    const monitor = requireFound(
      await this.monitors.updateForUser(userId, id, { paused: isPaused }),
    )
    await this.schedule.sync(monitor)
    return this.toDetail(monitor)
  }

  async checkNow(userId: number, id: number): Promise<void> {
    const monitor = requireFound(await this.monitors.findForUser(userId, id))
    if (monitor.paused) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ERROR_CODES.conflict,
        'This monitor is paused. Resume it to run checks.',
      )
    }
    await this.schedule.runNow(monitor.id)
  }

  private async toDetail(monitor: Monitor): Promise<MonitorDetail> {
    const now = new Date()
    const uptime = await this.uptime24h([monitor.id], now)
    return toMonitorDetail(monitor, now, uptime(monitor.id))
  }

  private async uptime24h(ids: number[], now: Date): Promise<(id: number) => number | null> {
    const totals = await this.history.totalsSince(ids, new Date(now.getTime() - MS_PER_DAY))
    return (id) => {
      const found = totals.get(id)
      return summarize(found ? [found] : []).uptime
    }
  }
}

// Another user's monitor is reported as missing rather than forbidden, so the
// response does not confirm that the id exists.
function requireFound(monitor: Monitor | null): Monitor {
  if (!monitor) throw notFound()
  return monitor
}

function notFound(): AppException {
  return new AppException(HttpStatus.NOT_FOUND, ERROR_CODES.notFound, 'Monitor not found')
}
