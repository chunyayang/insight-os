/**
 * Applies the persisted theme as a `.dark` class on <html>, on both server and client.
 *
 * Because the source is a cookie (see useTheme), the class is rendered during SSR — so
 * the very first painted HTML already carries `.dark` when appropriate, with no flash.
 * Binding it reactively via useHead means the toggle updates <html> automatically.
 */
export default defineNuxtPlugin(() => {
  const { isDark } = useTheme()

  useHead({
    htmlAttrs: {
      class: computed(() => (isDark.value ? 'dark' : '')),
    },
  })
})
