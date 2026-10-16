/**
 * The ONE place the visual identity is declared.
 *
 * Nuxt UI generates the full 50–950 ramps and every `--ui-*` semantic alias from these
 * two aliases, in both light and dark. There is deliberately no custom token stylesheet
 * alongside it: a private parallel vocabulary would drift from what Nuxt UI's own
 * components use the moment either side changed. The one adjustment, the light theme's
 * semantic aliases pointing at darker steps for WCAG AA, is in assets/css/main.css.
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
    // A neutral avatar's initials default to text-muted on bg-elevated: 4.35:1, under AA.
    avatar: {
      variants: {
        color: {
          neutral: { fallback: 'text-toned', icon: 'text-toned' },
        },
      },
    },
  },
})
