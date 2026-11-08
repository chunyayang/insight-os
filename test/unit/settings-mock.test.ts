import { describe, expect, it } from 'vitest'
import { parseOrgSettings } from '../../server/utils/mock/orgSettings'
import { parseUserSettings } from '../../server/utils/mock/userSettings'

// The mock keeps settings in cookies, which the browser can edit: reading one must
// never let an unknown value reach a response.
describe('mock settings cookies', () => {
  it('reads a stored market and falls back to All for anything else', () => {
    expect(parseUserSettings({ defaultMarket: 'TW' })).toEqual({ defaultMarket: 'TW' })
    expect(parseUserSettings({ defaultMarket: 'All' })).toEqual({ defaultMarket: 'All' })
    for (const stored of [undefined, null, 'TW', {}, { defaultMarket: 'XX' }]) {
      expect(parseUserSettings(stored)).toEqual({ defaultMarket: 'All' })
    }
  })

  it('reads a stored currency and falls back to the default for anything else', () => {
    expect(parseOrgSettings({ presentationCurrency: 'JPY' })).toEqual({
      presentationCurrency: 'JPY',
    })
    for (const stored of [undefined, null, {}, { presentationCurrency: 'GBP' }]) {
      expect(parseOrgSettings(stored)).toEqual({ presentationCurrency: 'USD' })
    }
  })
})
