import { afterEach, describe, expect, it, vi } from 'vitest'
import { csvFilename, escapeCsvValue, toCsv, type CsvColumn } from '../../app/utils/csv'

interface Row {
  name: string
  amount: number
  currency: string
}

const columns: CsvColumn<Row>[] = [
  { key: 'name', label: 'Customer', value: (row) => row.name },
  { key: 'amount', label: 'Lifetime value', value: (row) => row.amount },
  { key: 'currency', label: 'Currency', value: (row) => row.currency },
]

describe('escapeCsvValue', () => {
  it('leaves plain values alone', () => {
    expect(escapeCsvValue('Ava Mitchell')).toBe('Ava Mitchell')
    expect(escapeCsvValue(1234.5)).toBe('1234.5')
  })

  it('quotes and doubles embedded quotes, commas and newlines', () => {
    expect(escapeCsvValue('Doe, Jane')).toBe('"Doe, Jane"')
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""')
    expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"')
  })

  it('renders nullish cells as empty, not as "null"', () => {
    expect(escapeCsvValue(null)).toBe('')
    expect(escapeCsvValue(undefined)).toBe('')
  })

  /** A cell starting with =/+/-/@ is executed by Excel and Sheets when the file is opened. */
  it('neutralizes spreadsheet formula injection in text cells', () => {
    expect(escapeCsvValue('=1+1')).toBe("'=1+1")
    expect(escapeCsvValue('@SUM(A1:A9)')).toBe("'@SUM(A1:A9)")
    expect(escapeCsvValue('-2+3+cmd|calc')).toBe("'-2+3+cmd|calc")
  })

  /** …but a negative NUMBER is a number. Quoting it would break the column type on import. */
  it('does not mangle negative numbers', () => {
    expect(escapeCsvValue(-42)).toBe('-42')
  })

  it('drops non-finite numbers rather than writing Infinity into a numeric column', () => {
    expect(escapeCsvValue(Number.NaN)).toBe('')
    expect(escapeCsvValue(Number.POSITIVE_INFINITY)).toBe('')
  })
})

describe('toCsv', () => {
  it('writes a header row followed by one CRLF-separated row per record', () => {
    const csv = toCsv(
      [
        { name: 'Ava Mitchell', amount: 8420.5, currency: 'USD' },
        { name: '佐藤 陽菜', amount: 1_284_000, currency: 'JPY' },
      ],
      columns,
    )

    expect(csv.split('\r\n')).toEqual([
      'Customer,Lifetime value,Currency',
      'Ava Mitchell,8420.5,USD',
      '佐藤 陽菜,1284000,JPY',
    ])
  })

  /** The RAW amount, never the rendered cell: "¥1,284,000" is text a spreadsheet cannot sum. */
  it('exports amounts as bare numbers with the currency in its own column', () => {
    const csv = toCsv([{ name: 'Lena', amount: 1284, currency: 'EUR' }], columns)
    expect(csv).toContain('Lena,1284,EUR')
    expect(csv).not.toContain('€')
  })

  it('emits a header-only file when there are no rows', () => {
    expect(toCsv([], columns)).toBe('Customer,Lifetime value,Currency')
  })
})

describe('csvFilename', () => {
  const realResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions

  /**
   * Pins the zone the export reads as being dated in. `csvFilename` asks for it by name, so
   * this decides the stamp without the runner's own TZ having any say.
   */
  function inTimeZone(timeZone: string) {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(function (
      this: Intl.DateTimeFormat,
    ) {
      return { ...realResolvedOptions.call(this), timeZone }
    })
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('date-stamps the export, since it is a snapshot of one moment', () => {
    inTimeZone('UTC')
    expect(csvFilename('customers', new Date('2026-08-05T10:30:00Z'))).toBe(
      'customers-2026-08-05.csv',
    )
  })

  /**
   * One instant, two dates: 23:30 UTC is already the 20th in Taipei and still the 19th in New
   * York. Dating off UTC would file both under the 19th, which is the wrong day for half the
   * markets this ships to.
   */
  it("follows the exporter's own zone rather than UTC", () => {
    const instant = new Date('2026-09-19T23:30:00Z')

    inTimeZone('Asia/Taipei')
    expect(csvFilename('customers', instant)).toBe('customers-2026-09-20.csv')

    inTimeZone('America/New_York')
    expect(csvFilename('customers', instant)).toBe('customers-2026-09-19.csv')
  })

  /**
   * Zero-padded ASCII Gregorian, whatever locale the machine defaults to — the formatter pins
   * calendar and numbering system precisely so a Thai, Japanese or Persian default cannot put
   * 2569, Reiwa 8 or ۱۴۰۵ into a filename.
   */
  it('stamps a sortable YYYY-MM-DD', () => {
    inTimeZone('UTC')
    expect(csvFilename('customers', new Date('2026-01-07T12:00:00Z'))).toBe(
      'customers-2026-01-07.csv',
    )
    expect(csvFilename('customers', new Date('2026-01-07T12:00:00Z'))).toMatch(
      /^customers-\d{4}-\d{2}-\d{2}\.csv$/,
    )
  })
})
