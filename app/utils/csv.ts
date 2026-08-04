/**
 * CSV export — a pure transform over rows the client already has.
 *
 * The columns here are deliberately NOT the table's display columns. A money cell renders
 * per record in its native currency ("¥1,234" / "1.234,00 €"), and re-parsing that back into
 * a number would be both locale-dependent and currency-blind. Each CSV column reads the
 * underlying value instead — the raw number, the ISO timestamp, the code — so a spreadsheet
 * gets something it can actually sum and sort. Formatting stays a display concern.
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
 * Quote a single cell per RFC 4180, and neutralize spreadsheet formula injection.
 *
 * A text cell starting with `=`, `+`, `-` or `@` is evaluated as a formula by Excel and
 * Sheets, which turns an exported customer name into an attack on whoever opens the file.
 * Prefixing an apostrophe forces it back to text. Numbers are exempt — a negative number
 * is a number, and quoting it would break the column type on import.
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

/** `customers` → `customers-2026-08-05.csv`. Exports are snapshots; the date says which. */
export function csvFilename(base: string, now: Date = new Date()): string {
  return `${base}-${now.toISOString().slice(0, 10)}.csv`
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
