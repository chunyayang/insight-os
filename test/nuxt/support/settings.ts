import { useQueryClient } from '@tanstack/vue-query'
import { orgSettingsKeys } from '../../../app/composables/queries/useOrgSettingsQuery'
import { userSettingsKeys } from '../../../app/composables/queries/useUserSettingsQuery'
import type { OrgSettings, UserSettings } from '../../../app/types/api'
import { withNuxtContext } from './context'

/** Puts org settings in the cache, as the layout has by the time any page mounts. */
export function seedOrgSettings(settings: OrgSettings) {
  withNuxtContext(() => useQueryClient().setQueryData(orgSettingsKeys.all, settings))
}

/** Puts a user's settings in the cache. With no `userId`, the signed-out key the tests mount under. */
export function seedUserSettings(settings: UserSettings, userId?: string) {
  withNuxtContext(() => useQueryClient().setQueryData(userSettingsKeys.me(userId), settings))
}
