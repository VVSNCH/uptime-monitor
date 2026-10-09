import { Module } from '@nestjs/common'

import { HistoryRepository } from './history.repository.js'

// Its own module so both monitors (for uptime24h) and stats can use it without
// importing each other.
@Module({
  providers: [HistoryRepository],
  exports: [HistoryRepository],
})
export class HistoryModule {}
