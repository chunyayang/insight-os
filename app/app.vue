<script setup lang="ts">
// Keep <html lang> (and dir) in sync with the active locale. Required for the WCAG AA
// floor — screen readers announce content in the right language — and it lets the font
// stack pick the Traditional Chinese face for zh-TW instead of a mismatched fallback.
// The `.dark` class on <html> is contributed separately by plugins/theme.ts; Unhead
// merges both sets of htmlAttrs.
const localeHead = useLocaleHead()
useHead(() => ({
  htmlAttrs: localeHead.value.htmlAttrs,
}))
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
