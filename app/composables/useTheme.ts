export type ThemeMode = 'light' | 'dark'

const COOKIE_KEY = 'insight-theme'

/**
 * Dark-mode control. The choice is persisted in a COOKIE (not localStorage) so it is
 * readable during SSR — that's what lets `plugins/theme.ts` stamp the `.dark` class on
 * <html> before first paint, preventing a light-flash (FOUC). Nuxt UI's `--ui-*` tokens
 * key off that same class; `useChartTheme()` reads the same cookie through `isDark`.
 *
 * This is UI state, so it belongs to a composable over a cookie — not the server-data
 * layer (Vue Query) and not a Pinia store (no cross-component coordination needed).
 */
export function useTheme() {
  const mode = useCookie<ThemeMode>(COOKIE_KEY, {
    default: () => 'light',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    watch: true,
  })

  const isDark = computed(() => mode.value === 'dark')

  function setTheme(next: ThemeMode) {
    mode.value = next
  }

  function toggle() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  return { mode, isDark, setTheme, toggle }
}
