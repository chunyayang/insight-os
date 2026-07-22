/**
 * Pure UI chrome state. No server data, ever.
 * Theme lives in useTheme() (cookie-backed); this store holds layout state.
 */
export const useUiStore = defineStore('ui', () => {
  /** Sidebar collapsed to an icon-only rail. Persisted so it survives navigation/reload. */
  const sidebarCollapsed = useCookie<boolean>('insight-sidebar-collapsed', {
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    default: () => false,
  })

  /** Mobile drawer visibility — transient, not persisted. */
  const mobileNavOpen = ref(false)

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function openMobileNav() {
    mobileNavOpen.value = true
  }

  function closeMobileNav() {
    mobileNavOpen.value = false
  }

  return { sidebarCollapsed, mobileNavOpen, toggleSidebar, openMobileNav, closeMobileNav }
})
