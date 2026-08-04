import { describe, expect, it } from 'vitest'
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

  /**
   * The export carries the RAW amount, never the rendered cell. "¥1,284,000" would arrive
   * as text a spreadsheet can't sum, and re-parsing it back would be locale-dependent.
   */
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
  it('date-stamps the export, since it is a snapshot of one moment', () => {
    expect(csvFilename('customers', new Date('2026-08-05T10:30:00Z'))).toBe(
      'customers-2026-08-05.csv',
    )
  })
})
