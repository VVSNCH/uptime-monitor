import { Module } from '@nestjs/common'

import { OutboundModule } from '../outbound/outbound.module.js'
import { QueueModule } from '../queue/queue.module.js'
import { EmailChannel } from './email.channel.js'
import { NotificationProducer } from './notification.producer.js'
import { NotifyProcessor } from './notify.processor.js'
import { NotifyRepository } from './notify.repository.js'
import { WebhookChannel } from './webhook.channel.js'

@Module({
  imports: [QueueModule, OutboundModule],
  providers: [
    NotifyRepository,
    WebhookChannel,
    EmailChannel,
    NotificationProducer,
    NotifyProcessor,
  ],
  exports: [NotificationProducer],
})
export class NotifyModule {}
