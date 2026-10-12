import { DemoTargetService } from './demo-target.service.js'

describe('DemoTargetService', () => {
  it('starts up', () => {
    expect(new DemoTargetService().current()).toEqual({ mode: 'up', statusCode: 200 })
  })

  it('answers 503 when down and holds requests open on timeout', () => {
    const target = new DemoTargetService()

    expect(target.set({ mode: 'down' })).toEqual({ mode: 'down', statusCode: 503 })
    expect(target.set({ mode: 'timeout' })).toEqual({ mode: 'timeout', statusCode: null })
  })

  it('answers the chosen status, and ignores one given with another mode', () => {
    const target = new DemoTargetService()

    expect(target.set({ mode: 'status', statusCode: 429 }).statusCode).toBe(429)
    expect(target.set({ mode: 'up', statusCode: 500 }).statusCode).toBe(200)
  })
})
