const MS_PER_DAY = 86_400_000

export function startOfUtcDay(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()))
}

export function addDays(day: Date, days: number): Date {
  return new Date(day.getTime() + days * MS_PER_DAY)
}

export function toIsoDay(day: Date): string {
  return day.toISOString().slice(0, 10)
}

export function parseIsoDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const day = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(day.getTime()) || toIsoDay(day) !== value ? null : day
}

// Full days only, oldest first, ending yesterday. Today is still being written.
export function daysToRollUp(now: Date, lookbackDays: number): Date[] {
  const today = startOfUtcDay(now)
  return Array.from({ length: lookbackDays }, (_, index) => addDays(today, index - lookbackDays))
}

// Whole days are pruned, so a day is either fully in raw checks or not at all.
export function retentionCutoff(now: Date, retentionDays: number): Date {
  return addDays(startOfUtcDay(now), -retentionDays)
}
