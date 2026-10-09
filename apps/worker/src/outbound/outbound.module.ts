import { Module } from '@nestjs/common'

import { UrlGuardService } from './url-guard.service.js'

// Everything that sends a request to an address a user typed goes through
// here: monitor checks and webhook deliveries alike.
@Module({
  providers: [UrlGuardService],
  exports: [UrlGuardService],
})
export class OutboundModule {}
