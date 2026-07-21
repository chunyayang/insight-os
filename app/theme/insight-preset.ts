import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

/**
 * Insight OS PrimeVue preset.
 *
 * Aligns the Aura preset to the design tokens (see tokens.css / the
 * insight-os-design-tokens skill): primary = emerald, surface = slate. This keeps
 * PrimeVue component colors and the CSS custom-property tokens from diverging.
 * Dark mode is driven by the `.dark` class (darkModeSelector in nuxt.config.ts),
 * so the light/dark surface ramps below both resolve against that class.
 *
 * The `{palette.step}` tokens are Aura primitive references resolved by
 * @primeuix/themes — this is the color-definition layer, so palette hex/refs here
 * are expected (the "no raw hex" rule governs component/styling code, not the theme).
 */
export const InsightPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{emerald.50}',
      100: '{emerald.100}',
      200: '{emerald.200}',
      300: '{emerald.300}',
      400: '{emerald.400}',
      500: '{emerald.500}',
      600: '{emerald.600}',
      700: '{emerald.700}',
      800: '{emerald.800}',
      900: '{emerald.900}',
      950: '{emerald.950}',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '{slate.50}',
          100: '{slate.100}',
          200: '{slate.200}',
          300: '{slate.300}',
          400: '{slate.400}',
          500: '{slate.500}',
          600: '{slate.600}',
          700: '{slate.700}',
          800: '{slate.800}',
          900: '{slate.900}',
          950: '{slate.950}',
        },
      },
      dark: {
        surface: {
          0: '#ffffff',
          50: '{slate.50}',
          100: '{slate.100}',
          200: '{slate.200}',
          300: '{slate.300}',
          400: '{slate.400}',
          500: '{slate.500}',
          600: '{slate.600}',
          700: '{slate.700}',
          800: '{slate.800}',
          900: '{slate.900}',
          950: '{slate.950}',
        },
      },
    },
  },
})
