import type { RangeToken } from '../../../app/types/api'

/** ISO date (YYYY-MM-DD) for a Date, UTC-based so mocks don't shift with server TZ. */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/** Inclusive list of ISO dates between two dates. */
export function eachDay(from: Date, to: Date): string[] {
  const out: string[] = []
  for (let d = new Date(from); d <= to; d = addDays(d, 1)) out.push(isoDate(d))
  return out
}

/**
 * Resolve a range token (or explicit from/to) into a concrete day list.
 *
 * Range is a DATA-SCOPE change by contract: it decides which days are aggregated and
 * therefore which daily FX rates apply — so it belongs in the query key and triggers a
 * server refetch. (The currency toggle, by contrast, never reaches the server.)
 */
export function resolveRange(
  opts: { range?: RangeToken; from?: string; to?: string },
  today = new Date(),
): { from: string; to: string; days: string[] } {
  const end = opts.to ? new Date(`${opts.to}T00:00:00Z`) : today
  let start: Date

  if (opts.from) {
    start = new Date(`${opts.from}T00:00:00Z`)
  } else {
    switch (opts.range) {
      case '7d':
        start = addDays(end, -6)
        break
      case '90d':
        start = addDays(end, -89)
        break
      case 'mtd':
        start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))
        break
      case 'ytd':
        start = new Date(Date.UTC(end.getUTCFullYear(), 0, 1))
        break
      case '30d':
      default:
        start = addDays(end, -29)
        break
    }
  }

  return { from: isoDate(start), to: isoDate(end), days: eachDay(start, end) }
}
