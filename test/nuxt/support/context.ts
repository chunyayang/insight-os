/**
 * Runs `fn` the way app code outside a component is entered (`plugins/vue-query.ts`):
 * through `nuxtApp.runWithContext`. Its return type also covers the server's async
 * branch; these tests run the client's, which calls `fn` synchronously.
 */
export function withNuxtContext<T>(fn: () => T): T {
  return useNuxtApp().runWithContext(fn) as T
}
