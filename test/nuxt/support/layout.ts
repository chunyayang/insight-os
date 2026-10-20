import { afterAll, beforeAll } from 'vitest'

const SIZE = { clientWidth: 800, clientHeight: 400 } as const

/**
 * For a file that mounts a chart: happy-dom does no layout, so every element measures 0×0
 * and ECharts refuses to initialise on it ("Can't get DOM width or height"). Only these two
 * properties are faked — scroll and offset sizes still read 0 — so keep it out of files
 * whose code compares them.
 */
export function stubElementSize() {
  beforeAll(() => {
    for (const [property, px] of Object.entries(SIZE)) {
      Object.defineProperty(HTMLElement.prototype, property, { configurable: true, get: () => px })
    }
  })

  // The real getters live on Element.prototype; removing ours uncovers them.
  afterAll(() => {
    for (const property of Object.keys(SIZE))
      Reflect.deleteProperty(HTMLElement.prototype, property)
  })
}
