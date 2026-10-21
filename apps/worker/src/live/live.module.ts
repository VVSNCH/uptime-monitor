import { Module } from '@nestjs/common'

import { LiveEventPublisher } from './live-event.publisher.js'

@Module({
  providers: [LiveEventPublisher],
  exports: [LiveEventPublisher],
})
export class LiveModule {}
