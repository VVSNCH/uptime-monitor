import {
  DEMO_TARGET_MODES,
  type DemoTargetMode,
  type DemoTargetState,
  type SetDemoTargetRequest,
} from '@uptime/shared'
import { IsIn, IsInt, Max, Min, ValidateIf } from 'class-validator'

import { DEMO_TARGET_STATUS } from '../../constants/index.js'

const STATUS_CODE_MESSAGE = `statusCode must be a whole number from ${DEMO_TARGET_STATUS.min} to ${DEMO_TARGET_STATUS.max} when mode is status`

export class SetDemoTargetDto implements SetDemoTargetRequest {
  /** up answers 200, down answers 503, timeout never answers in time, status answers statusCode. */
  @IsIn(DEMO_TARGET_MODES, { message: `mode must be one of ${DEMO_TARGET_MODES.join(', ')}` })
  mode!: DemoTargetMode

  /** Required when mode is status. */
  @ValidateIf((request: SetDemoTargetDto) => request.mode === 'status')
  @IsInt({ message: STATUS_CODE_MESSAGE })
  @Min(DEMO_TARGET_STATUS.min, { message: STATUS_CODE_MESSAGE })
  @Max(DEMO_TARGET_STATUS.max, { message: STATUS_CODE_MESSAGE })
  statusCode?: number
}

export class DemoTargetStateDto implements DemoTargetState {
  mode!: DemoTargetMode
  /** Null while the target is holding requests open. */
  statusCode!: number | null
}
