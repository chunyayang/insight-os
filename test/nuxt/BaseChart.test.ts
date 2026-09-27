import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BaseChart from '../../app/components/charts/BaseChart.vue'

describe('BaseChart', () => {
  it('forces animation off while the OS asks for reduced motion, and follows it live', async () => {
    let onChange: ((e: { matches: boolean }) => void) | undefined
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: (_: string, listener: (e: { matches: boolean }) => void) => {
        onChange = listener
      },
    } as unknown as MediaQueryList)

    const wrapper = await mountSuspended(BaseChart, {
      props: { option: { animation: true, series: [] }, summary: 'Revenue trend' },
    })
    const option = () => wrapper.findComponent({ name: 'Echarts' }).props('option')

    expect(option().animation).toBe(false)

    onChange?.({ matches: false })
    await nextTick()
    // With no preference, the wrapper's own choice stands.
    expect(option().animation).toBe(true)
  })
})
