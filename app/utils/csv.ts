/**
 * CSV export — a pure transform over rows the client already has.
 *
 * The columns are deliberately NOT the table's display columns: re-parsing a formatted money cell
 * ("¥1,234") back into a number is locale-dependent and currency-blind, so each column reads the
 * underlying raw value. A cell rendering two currencies exports as separate columns for both
 * amounts and both codes, never one column holding two numbers.
 */

export interface CsvColumn<T> {
  /** Stable identifier — not rendered, but keeps columns diffable against the table. */
  key: string
  /** Localized header cell. */
  label: string
  value: (row: T) => string | number | null | undefined
}

export interface CsvExport<T> {
  /** Base name, without the date suffix or extension. */
  filename: string
  columns: CsvColumn<T>[]
}

const DELIMITER = ','
/** RFC 4180 says CRLF, and Excel is the strictest consumer we have to satisfy. */
const ROW_SEPARATOR = '\r\n'

/**
 * Quote a single cell per RFC 4180, and neutralize spreadsheet formula injection: a text cell
 * starting with `=`, `+`, `-` or `@` is evaluated as a formula by Excel and Sheets, which
 * turns an exported customer name into an attack on whoever opens the file. Numbers are
 * exempt — quoting a negative number would break the column type on import.
 */
export function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''

  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /["\n\r,]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

/** Header row + one row per record. Pure — testable without a DOM. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeCsvValue(column.label)).join(DELIMITER)
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(column.value(row))).join(DELIMITER),
  )
  return [header, ...body].join(ROW_SEPARATOR)
}

/**
 * `customers` → `customers-2026-08-05.csv`. Exports are snapshots; the date says which.
 *
 * Stamped in the exporter's own date rather than UTC: an evening export in JP or TW would
 * otherwise be filed under the previous day, and an early-morning one in the US under the next.
 *
 * The zone floats but the locale is pinned. Left to default, the OS locale picks the calendar
 * and the digits — a Thai default stamps 2569, a Japanese one Reiwa 8, an Arabic or Persian one
 * non-ASCII numerals. A filename needs a sortable ASCII Gregorian date in every one of them.
 */
export function csvFilename(base: string, now: Date = new Date()): string {
  // Taken explicitly rather than left to the formatter's default, so the zone the export is
  // dated in is one named thing that can be pinned.
  const { timeZone } = new Intl.DateTimeFormat().resolvedOptions()

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    calendar: 'gregory',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  // Every one of these is requested above, so the formatter always emits it.
  const at = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)!.value

  return `${base}-${at('year')}-${at('month')}-${at('day')}.csv`
}

/**
 * Hand the CSV to the browser as a download. Client-only (touches the DOM).
 *
 * The leading BOM is not optional: without it Excel decodes UTF-8 as the system codepage
 * and every 繁體中文 header arrives as mojibake.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
