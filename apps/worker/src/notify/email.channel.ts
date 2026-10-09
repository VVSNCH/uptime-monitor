import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { ChannelTestResult } from '@uptime/shared'
import { createTransport, type Transporter } from 'nodemailer'

import type { Env } from '../config/env.js'
import { EMAIL_TIMEOUT_MS } from '../constants/index.js'
import type { Message } from './message.js'

export const EMAIL_NOT_CONFIGURED = 'Email is not set up on this server: SMTP_URL is missing'

// smtp:// or smtps://user:password@host:port. Read into explicit options so
// every stage of the conversation with the mail server has a time limit.
function transportFrom(smtpUrl: string): Transporter {
  const url = new URL(smtpUrl)
  const isSecure = url.protocol === 'smtps:'
  return createTransport({
    host: url.hostname,
    port: url.port ? Number(url.port) : isSecure ? 465 : 587,
    secure: isSecure,
    auth: url.username
      ? { user: decodeURIComponent(url.username), pass: decodeURIComponent(url.password) }
      : undefined,
    connectionTimeout: EMAIL_TIMEOUT_MS,
    greetingTimeout: EMAIL_TIMEOUT_MS,
    socketTimeout: EMAIL_TIMEOUT_MS,
  })
}

@Injectable()
export class EmailChannel {
  private readonly transport: Transporter | null
  private readonly from: string

  constructor(@Inject(ConfigService) config: ConfigService<Env, true>) {
    const smtpUrl = config.get('SMTP_URL', { infer: true })
    this.transport = smtpUrl ? transportFrom(smtpUrl) : null
    this.from = config.get('ALERT_FROM_EMAIL', { infer: true })
  }

  get isConfigured(): boolean {
    return this.transport !== null
  }

  async send(to: string, message: Message): Promise<ChannelTestResult> {
    if (!this.transport) return { delivered: false, statusCode: null, error: EMAIL_NOT_CONFIGURED }

    try {
      await this.transport.sendMail({
        from: this.from,
        to,
        subject: message.subject,
        text: message.text,
      })
      return { delivered: true, statusCode: null, error: null }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'The mail server refused the message'
      return { delivered: false, statusCode: null, error: reason }
    }
  }
}
