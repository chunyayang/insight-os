/**
 * The ONE place the visual identity is declared.
 *
 * Nuxt UI generates the full 50–950 ramps and every `--ui-*` semantic alias from these
 * two aliases, in both light and dark. There is deliberately no custom token stylesheet
 * alongside it: a private parallel vocabulary would drift from what Nuxt UI's own
 * components use the moment either side changed. main.css derives only the text shade
 * of each semantic color (`--ink-*`).
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
    // Neutral avatars fill with bg-elevated, where only text-toned and darker hold WCAG AA.
    avatar: {
      variants: {
        color: {
          neutral: { fallback: 'text-toned', icon: 'text-toned' },
        },
      },
    },
    badge: {
      compoundVariants: [
        // No yellow dark enough to read as text still looks yellow: the dot carries the hue.
        {
          color: 'warning',
          variant: ['soft', 'subtle'],
          class:
            "text-default before:size-1.5 before:rounded-full before:bg-warning-600 before:content-['']",
        },
      ],
    },
    button: {
      compoundVariants: [
        // White labels need a darker fill than the 500 the rest of the palette uses.
        {
          color: 'primary',
          variant: 'solid',
          class:
            'bg-primary-600 hover:bg-primary-700 active:bg-primary-700 disabled:bg-primary-600 aria-disabled:bg-primary-600 dark:bg-primary dark:hover:bg-primary/75 dark:active:bg-primary/75 dark:disabled:bg-primary dark:aria-disabled:bg-primary',
        },
      ],
    },
  },
})
