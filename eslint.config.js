// Flat config. `@nuxt/eslint` generates .nuxt/eslint.config.mjs on `nuxt prepare`
// (run via postinstall), which withNuxt() extends with Nuxt/Vue-aware defaults.
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Formatting is owned by Prettier; keep ESLint focused on correctness.
    'vue/multi-word-component-names': 'off',
  },
})
