/**
 * The ONE place the visual identity is declared.
 *
 * Nuxt UI generates the full 50–950 ramps and every `--ui-*` semantic alias from these
 * two aliases, in both light and dark. There is deliberately no custom token stylesheet
 * alongside it: a private parallel vocabulary would drift from what Nuxt UI's own
 * components use the moment either side changed.
 *
 * emerald/slate are the same values the retired tokens.css resolved by hand, so the
 * identity is unchanged — see .claude/doc/nuxt-ui-migration.md.
 */
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'emerald',
      neutral: 'slate',
      // The AI accent. Aliased rather than used as a raw palette colour so it resolves
      // per theme like every other semantic token.
      secondary: 'violet',
    },
  },
})
