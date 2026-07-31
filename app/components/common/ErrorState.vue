<script setup lang="ts">
import { errorKey } from '~/utils/errors'

/**
 * Part of the mandatory three-state floor: loading / empty / ERROR.
 * Copy is localized off `error.code` — components never render the raw server message.
 * Always offers a recovery trigger.
 */
const props = defineProps<{
  error?: unknown
  /** Override the derived message when a surface has more specific copy. */
  message?: string
}>()

const emit = defineEmits<{ retry: [] }>()

const { t } = useI18n()

const text = computed(() => props.message ?? t(errorKey(props.error)))
</script>

<template>
  <div class="error-state" role="alert">
    <i class="pi pi-exclamation-triangle error-state__icon" aria-hidden="true" />
    <p class="error-state__message">{{ text }}</p>
    <Button
      :label="t('common.actions.retry')"
      icon="pi pi-refresh"
      severity="secondary"
      size="small"
      outlined
      @click="emit('retry')"
    />
  </div>
</template>

<style scoped>
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2.5rem 1.5rem;
  text-align: center;
}

.error-state__icon {
  font-size: 1.75rem;
  color: var(--ui-error);
}

.error-state__message {
  color: var(--ui-text-muted);
  max-width: 40ch;
}
</style>
