const QUERY = '(prefers-reduced-motion: reduce)'

// Module-level so every chart shares one media-query listener for the app's lifetime.
// Written only on the client, so on the server it stays `false` and can't leak between
// requests.
const prefersReducedMotion = ref(false)
let subscribed = false

/**
 * Whether the OS asks for reduced motion. Read synchronously on the client, so a chart's
 * very first option already carries the right `animation` flag; this can't cause a
 * hydration mismatch because chart options are never part of the server-rendered HTML.
 */
export function usePrefersReducedMotion() {
  if (import.meta.client && !subscribed) {
    subscribed = true
    const query = window.matchMedia(QUERY)
    prefersReducedMotion.value = query.matches
    query.addEventListener('change', (e) => {
      prefersReducedMotion.value = e.matches
    })
  }
  return readonly(prefersReducedMotion)
}
