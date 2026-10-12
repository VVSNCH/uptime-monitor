import type { DemoTargetMode } from '../constants/demo.js'

export interface SetDemoTargetRequest {
  mode: DemoTargetMode
  // Required for the status mode, ignored otherwise.
  statusCode?: number
}

export interface DemoTargetState {
  mode: DemoTargetMode
  // What the target answers with, or null while it is holding requests open.
  statusCode: number | null
}
