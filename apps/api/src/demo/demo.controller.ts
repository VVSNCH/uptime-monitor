import { setTimeout as sleep } from 'node:timers/promises'

import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'

import { Public } from '../auth/decorators/public.decorator.js'
import { DEMO_TARGET_HOLD_MS } from '../constants/index.js'
import { DemoTargetService } from './demo-target.service.js'
import { DemoTargetStateDto, SetDemoTargetDto } from './dto/demo-target.dto.js'

// Demo scaffolding, not part of the product: a URL to point a monitor at
// whose answer can be switched on cue to show an outage and a recovery.
@ApiTags('demo')
@Controller('demo/target')
export class DemoController {
  constructor(@Inject(DemoTargetService) private readonly target: DemoTargetService) {}

  /** What a monitor checks. Answers with whatever the target is currently set to. */
  @Public()
  @Get()
  async check(@Res({ passthrough: true }) res: Response): Promise<DemoTargetStateDto> {
    const state = this.target.current()
    // Held past the longest timeout a monitor can have, so every check of it times out.
    if (state.statusCode === null) await sleep(DEMO_TARGET_HOLD_MS)
    res.status(state.statusCode ?? HttpStatus.SERVICE_UNAVAILABLE)
    return state
  }

  /** Switches what the target answers with. Requires signing in, so it cannot be flipped anonymously. */
  @ApiBearerAuth()
  @Post()
  @HttpCode(HttpStatus.OK)
  set(@Body() body: SetDemoTargetDto): DemoTargetStateDto {
    return this.target.set(body)
  }
}
