import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '@uptime/database/nest'
import { TRANSITION } from '@uptime/shared'

import type { ProbeResult } from './http-probe.service.js'
import type { Evaluation, MonitorState } from './state-machine.service.js'

export interface MonitorToCheck {
  id: number
  url: string
  method: string
  timeoutMs: number
  expectedStatus: number | null
  paused: boolean
}

export interface RecordedCheck {
  evaluation: Evaluation
  incidentId: number | null
}

const UNKNOWN_CAUSE = 'Check failed'

@Injectable()
export class CheckRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findMonitor(id: number): Promise<MonitorToCheck | null> {
    return this.prisma.monitor.findUnique({
      where: { id },
      select: {
        id: true,
        url: true,
        method: true,
        timeoutMs: true,
        expectedStatus: true,
        paused: true,
      },
    })
  }

  // Inserting the row before probing is what makes a check happen at most once
  // per occurrence. The unique key on (monitor, occurrence) means a second
  // delivery of the same job inserts nothing and is told to stop.
  async claim(monitorId: number, scheduledFor: Date): Promise<boolean> {
    const { count } = await this.prisma.check.createMany({
      data: [{ monitorId, scheduledFor }],
      skipDuplicates: true,
    })
    return count === 1
  }

  // The result, the monitor's new status and any incident change are written
  // together, with the monitor row locked, so two checks of one monitor that
  // finish at once cannot both read the old failure count, and an open incident
  // and a DOWN status can never disagree. Returns null if the monitor was
  // deleted while it was being checked.
  async record(
    monitorId: number,
    scheduledFor: Date,
    result: ProbeResult,
    decide: (state: MonitorState) => Evaluation,
  ): Promise<RecordedCheck | null> {
    const checkedAt = new Date()

    return this.prisma.$transaction(async (tx) => {
      const [state] = await tx.$queryRaw<MonitorState[]>`
        SELECT status,
               consecutive_failures AS "consecutiveFailures",
               failure_threshold AS "failureThreshold"
        FROM monitors
        WHERE id = ${monitorId}
        FOR UPDATE`
      if (!state) return null

      await tx.check.updateMany({
        where: { monitorId, scheduledFor },
        data: {
          checkedAt,
          ok: result.ok,
          statusCode: result.statusCode,
          responseMs: result.responseMs,
          error: result.error,
        },
      })

      const evaluation = decide(state)
      await tx.monitor.update({
        where: { id: monitorId },
        data: {
          status: evaluation.status,
          consecutiveFailures: evaluation.consecutiveFailures,
          lastCheckedAt: checkedAt,
          lastResponseMs: result.responseMs,
        },
      })

      if (evaluation.transition === TRANSITION.down) {
        // The outage began at the first failure of the run, not at the one that
        // confirmed it, so the incident and its duration start there.
        const streak = await tx.check.findMany({
          where: { monitorId, ok: false },
          orderBy: { scheduledFor: 'desc' },
          take: evaluation.consecutiveFailures,
          select: { checkedAt: true },
        })
        const incident = await tx.incident.create({
          data: {
            monitorId,
            startedAt: streak.at(-1)?.checkedAt ?? checkedAt,
            cause: result.error ?? UNKNOWN_CAUSE,
          },
        })
        return { evaluation, incidentId: incident.id }
      }

      if (evaluation.transition === TRANSITION.recovered) {
        const open = await tx.incident.findFirst({ where: { monitorId, endedAt: null } })
        if (open) {
          await tx.incident.update({ where: { id: open.id }, data: { endedAt: checkedAt } })
          return { evaluation, incidentId: open.id }
        }
      }

      return { evaluation, incidentId: null }
    })
  }
}
