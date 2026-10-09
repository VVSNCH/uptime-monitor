import { occurrenceOf } from './check.processor.js'

describe('occurrenceOf', () => {
  const created = Date.parse('2026-10-08T18:27:16.386Z')

  it('uses the creation time for a job that runs straight away', () => {
    expect(occurrenceOf({ timestamp: created, opts: {} })).toEqual(new Date(created))
  })

  it('uses the due time for a scheduled job, even after BullMQ resets its delay', () => {
    // Taken from a real completed job: delay was 0 by then, opts.delay was not.
    expect(occurrenceOf({ timestamp: created, opts: { delay: 59_957 } })).toEqual(
      new Date('2026-10-08T18:28:16.343Z'),
    )
  })

  it('keeps two jobs created in the same millisecond apart when they are due at different times', () => {
    const immediate = occurrenceOf({ timestamp: created, opts: {} })
    const next = occurrenceOf({ timestamp: created, opts: { delay: 60_000 } })

    expect(immediate).not.toEqual(next)
  })
})
