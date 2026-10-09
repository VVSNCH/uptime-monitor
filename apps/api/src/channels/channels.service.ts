import { randomBytes } from 'node:crypto'

import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import type { NotificationChannel } from '@uptime/database'
import { AppException } from '@uptime/nest-common'
import {
  CHANNEL_TYPE,
  type ChannelResponse,
  type ChannelTestResult,
  type ChannelType,
  type CreateChannelRequest,
  ERROR_CODES,
  type UpdateChannelRequest,
} from '@uptime/shared'

import { WEBHOOK_SECRET_BYTES, WEBHOOK_SECRET_PREFIX } from '../constants/index.js'
import { ChannelTester } from './channel-tester.service.js'
import { ChannelsRepository } from './channels.repository.js'
import { isValidTarget, targetMessage } from './dto/channel.dto.js'

@Injectable()
export class ChannelsService {
  constructor(
    @Inject(ChannelsRepository) private readonly channels: ChannelsRepository,
    @Inject(ChannelTester) private readonly tester: ChannelTester,
  ) {}

  async list(userId: number): Promise<ChannelResponse[]> {
    return (await this.channels.listForUser(userId)).map(toChannelResponse)
  }

  // The signing secret is generated here, never chosen by the user, so it is
  // always long and random.
  async create(userId: number, request: CreateChannelRequest): Promise<ChannelResponse> {
    const channel = await this.channels.create(userId, {
      type: request.type,
      target: request.target,
      secret: request.type === CHANNEL_TYPE.webhook ? newSigningSecret() : null,
      sendOnDown: request.sendOnDown ?? true,
      sendOnRecover: request.sendOnRecover ?? true,
    })
    return toChannelResponse(channel)
  }

  async update(
    userId: number,
    id: number,
    request: UpdateChannelRequest,
  ): Promise<ChannelResponse> {
    if (request.target !== undefined) {
      const existing = requireFound(await this.channels.findForUser(userId, id))
      assertValidTarget(existing.type, request.target)
    }
    return toChannelResponse(requireFound(await this.channels.updateForUser(userId, id, request)))
  }

  async remove(userId: number, id: number): Promise<void> {
    if (!(await this.channels.deleteForUser(userId, id))) throw notFound()
  }

  async test(userId: number, id: number): Promise<ChannelTestResult> {
    const channel = requireFound(await this.channels.findForUser(userId, id))
    return this.tester.test(channel.id)
  }
}

function toChannelResponse(channel: NotificationChannel): ChannelResponse {
  return {
    id: channel.id,
    type: channel.type,
    target: channel.target,
    enabled: channel.enabled,
    sendOnDown: channel.sendOnDown,
    sendOnRecover: channel.sendOnRecover,
    signingSecret: channel.secret,
    createdAt: channel.createdAt.toISOString(),
  }
}

function newSigningSecret(): string {
  return `${WEBHOOK_SECRET_PREFIX}${randomBytes(WEBHOOK_SECRET_BYTES).toString('base64url')}`
}

function assertValidTarget(type: ChannelType, target: string): void {
  if (isValidTarget(type, target)) return
  throw new AppException(HttpStatus.BAD_REQUEST, ERROR_CODES.validationFailed, targetMessage(type))
}

function requireFound(channel: NotificationChannel | null): NotificationChannel {
  if (!channel) throw notFound()
  return channel
}

function notFound(): AppException {
  return new AppException(HttpStatus.NOT_FOUND, ERROR_CODES.notFound, 'Channel not found')
}
