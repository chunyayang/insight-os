<script setup lang="ts">
import type { Role } from '~/types/api'
import { ROLES } from '~/constants/permissions'
import { errorKey, isApiError } from '~/utils/errors'

// Public route: the global auth guard skips it, and no app shell chrome here.
definePageMeta({ public: true, layout: false })

const { t } = useI18n()
const route = useRoute()
const login = useLoginMutation()

const email = ref('')
const password = ref('')
const selectedRole = ref<Role>('admin')
/** Validation stays quiet until the first submit, then becomes live. */
const submitted = ref(false)
/** Reveal toggle: UInput has no equivalent of PrimeVue's `toggle-mask`, so we swap `type`. */
const passwordVisible = ref(false)

/**
 * `undefined` rather than `''` for "no error", and that is load-bearing: UFormField
 * declares `error` as `[Boolean, String]`, and Vue's boolean casting turns an empty
 * string into `true` — every field would render invalid before the first submit.
 */
const emailError = computed(() => {
  if (!submitted.value) return undefined
  if (!email.value.trim()) return t('login.validation.emailRequired')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) return t('login.validation.emailInvalid')
  return undefined
})

const passwordError = computed(() => {
  if (!submitted.value) return undefined
  if (!password.value) return t('login.validation.passwordRequired')
  if (password.value.length < 6) return t('login.validation.passwordTooShort')
  return undefined
})

const isValid = computed(() => !emailError.value && !passwordError.value)

/** Auth failures get the spec's dedicated copy; anything else localizes off error.code. */
const serverError = computed(() => {
  const err = login.error.value
  if (!err) return ''
  if (isApiError(err) && err.error.code === 'INVALID_CREDENTIALS') {
    return t('errors.auth.invalidCredentials')
  }
  return t(errorKey(err))
})

const roleOptions = computed(() =>
  ROLES.map((role) => ({ label: t(`login.roles.${role}`), value: role })),
)

async function onSubmit() {
  submitted.value = true
  if (!isValid.value) return

  try {
    await login.mutateAsync({
      email: email.value,
      password: password.value,
      role: selectedRole.value,
    })
    await navigateTo((route.query.redirect as string) || '/')
  } catch {
    // Surfaced inline via `serverError`; nothing to do here.
  }
}
</script>

<template>
  <main class="login">
    <div class="login__switcher">
      <CommonLanguageSwitcher />
    </div>

    <section class="login__card">
      <header class="login__header">
        <h1 class="login__title">{{ t('login.title') }}</h1>
        <p class="login__subtitle">{{ t('login.subtitle') }}</p>
      </header>

      <!-- UFormField owns the label/error wiring: it generates the id, points its
           <label for> at the control, and hands the control aria-invalid +
           aria-describedby. The validation itself stays the hand-rolled computeds
           above — no UForm, no schema. -->
      <form class="login__form" novalidate @submit.prevent="onSubmit">
        <!-- role="alert" so the failure is announced: it is injected after the fact,
             which a screen reader would otherwise pass over silently. -->
        <UAlert
          v-if="serverError"
          role="alert"
          :description="serverError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
        />

        <UFormField :label="t('login.emailLabel')" :error="emailError">
          <UInput
            v-model="email"
            type="email"
            autocomplete="email"
            :placeholder="t('login.emailPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('login.passwordLabel')" :error="passwordError">
          <UInput
            v-model="password"
            :type="passwordVisible ? 'text' : 'password'"
            autocomplete="current-password"
            :placeholder="t('login.passwordPlaceholder')"
            class="w-full"
            :ui="{ trailing: 'pe-1' }"
          >
            <template #trailing>
              <UButton
                type="button"
                color="neutral"
                variant="link"
                size="sm"
                :icon="passwordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="
                  passwordVisible
                    ? t('common.actions.hidePassword')
                    : t('common.actions.showPassword')
                "
                :aria-pressed="passwordVisible"
                @click="passwordVisible = !passwordVisible"
              />
            </template>
          </UInput>
        </UFormField>

        <!-- The group label is URadioGroup's own <legend>, not UFormField's <label>:
             a fieldset is what a set of radios should be named by. UFormField still
             contributes the hint, which it links via aria-describedby. -->
        <UFormField :help="t('login.demoRoleHint')">
          <URadioGroup
            v-model="selectedRole"
            :items="roleOptions"
            :legend="t('login.demoRoleLabel')"
            orientation="horizontal"
          />
        </UFormField>

        <UButton
          type="submit"
          :label="login.isPending.value ? t('login.submitting') : t('login.submit')"
          :loading="login.isPending.value"
          size="lg"
          block
        />
      </form>
    </section>
  </main>
</template>

<style scoped>
/*
 * Only the page frame is hand-styled — the card, its header and the field rhythm.
 * Everything inside the form is Nuxt UI's own, so it carries no BEM.
 */
.login {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: var(--ui-bg-muted);
  position: relative;
}

.login__switcher {
  position: absolute;
  top: 1.25rem;
  inset-inline-end: 1.25rem;
}

.login__card {
  width: 100%;
  /* No rigid width: zh-TW text must be free to reflow without clipping. */
  max-width: 26rem;
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  padding: 2rem;
}

.login__header {
  margin-block-end: 1.5rem;
}

.login__title {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ui-text-highlighted);
}

.login__subtitle {
  margin-block-start: 0.375rem;
  color: var(--ui-text-muted);
}

.login__form {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
}
</style>
