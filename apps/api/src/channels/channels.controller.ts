import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import type { AuthUser } from '../auth/auth.types.js'
import { CurrentUser } from '../auth/decorators/current-user.decorator.js'
import { ChannelsService } from './channels.service.js'
import {
  ChannelDto,
  ChannelTestResultDto,
  CreateChannelDto,
  UpdateChannelDto,
} from './dto/channel.dto.js'

@ApiTags('channels')
@ApiBearerAuth()
@Controller('channels')
export class ChannelsController {
  constructor(@Inject(ChannelsService) private readonly channels: ChannelsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<ChannelDto[]> {
    return this.channels.list(user.id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateChannelDto): Promise<ChannelDto> {
    return this.channels.create(user.id, body)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateChannelDto,
  ): Promise<ChannelDto> {
    return this.channels.update(user.id, id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.channels.remove(user.id, id)
  }

  /** Sends a real sample message and reports what the receiver answered. */
  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  test(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ChannelTestResultDto> {
    return this.channels.test(user.id, id)
  }
}
