import { Controller, Inject, type MessageEvent, Sse } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type { Observable } from 'rxjs'

import type { AuthUser } from '../auth/auth.types.js'
import { CurrentUser } from '../auth/decorators/current-user.decorator.js'
import { LiveEventsService } from './live-events.service.js'

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(@Inject(LiveEventsService) private readonly live: LiveEventsService) {}

  /**
   * A server-sent event stream of changes to the caller's monitors: monitor.checked,
   * incident.opened and incident.closed, each with a monitorId, plus a ping every
   * 15 seconds. Events say what changed; fetch the resource for the new data.
   */
  @Sse()
  stream(@CurrentUser() user: AuthUser): Observable<MessageEvent> {
    return this.live.streamFor(user.id)
  }
}
