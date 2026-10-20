// happy-dom does no layout, so every element measures 0×0 and ECharts refuses to
// initialise on it ("Can't get DOM width or height"). Any fixed size will do: no test
// asserts on geometry.
for (const [property, px] of [
  ['clientWidth', 800],
  ['clientHeight', 400],
] as const) {
  Object.defineProperty(HTMLElement.prototype, property, { configurable: true, get: () => px })
}
