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

const emailError = computed(() => {
  if (!submitted.value) return ''
  if (!email.value.trim()) return t('login.validation.emailRequired')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) return t('login.validation.emailInvalid')
  return ''
})

const passwordError = computed(() => {
  if (!submitted.value) return ''
  if (!password.value) return t('login.validation.passwordRequired')
  if (password.value.length < 6) return t('login.validation.passwordTooShort')
  return ''
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

      <form novalidate @submit.prevent="onSubmit">
        <Message v-if="serverError" severity="error" class="login__alert" :closable="false">
          {{ serverError }}
        </Message>

        <div class="login__field">
          <label for="email" class="login__label">{{ t('login.emailLabel') }}</label>
          <InputText
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            :placeholder="t('login.emailPlaceholder')"
            :invalid="Boolean(emailError)"
            :aria-describedby="emailError ? 'email-error' : undefined"
            fluid
          />
          <small v-if="emailError" id="email-error" class="login__error">{{ emailError }}</small>
        </div>

        <div class="login__field">
          <label for="password" class="login__label">{{ t('login.passwordLabel') }}</label>
          <Password
            v-model="password"
            input-id="password"
            :feedback="false"
            toggle-mask
            autocomplete="current-password"
            :placeholder="t('login.passwordPlaceholder')"
            :invalid="Boolean(passwordError)"
            :aria-describedby="passwordError ? 'password-error' : undefined"
            fluid
          />
          <small v-if="passwordError" id="password-error" class="login__error">
            {{ passwordError }}
          </small>
        </div>

        <div class="login__field">
          <span id="role-label" class="login__label">{{ t('login.demoRoleLabel') }}</span>
          <SelectButton
            v-model="selectedRole"
            :options="roleOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            aria-labelledby="role-label"
          />
          <small class="login__hint">{{ t('login.demoRoleHint') }}</small>
        </div>

        <Button
          type="submit"
          :label="login.isPending.value ? t('login.submitting') : t('login.submit')"
          :loading="login.isPending.value"
          fluid
        />
      </form>
    </section>
  </main>
</template>

<style scoped>
/* Colors come from design tokens only — no raw hex, no Tailwind palette classes. */
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

.login__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-block-end: 1.125rem;
}

.login__label {
  font-weight: 600;
  color: var(--ui-text-highlighted);
}

.login__error {
  color: var(--ui-error);
}

.login__hint {
  color: var(--ui-text-dimmed);
}

.login__alert {
  margin-block-end: 1rem;
}
</style>
