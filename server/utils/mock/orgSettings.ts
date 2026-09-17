import { DEFAULT_CURRENCY } from '../../../app/constants/markets'
import type { OrgSettings } from '../../../app/types/api'

/**
 * In-memory mock organization config, shared across requests for the life of the dev
 * server (resets on restart). The real backend persists this in the database; the mock
 * only needs GET/PATCH to agree within one running process.
 */
const state: OrgSettings = {
  presentationCurrency: DEFAULT_CURRENCY,
}

export function getOrgSettings(): OrgSettings {
  return { ...state }
}

export function updateOrgSettings(patch: Partial<OrgSettings>): OrgSettings {
  Object.assign(state, patch)
  return { ...state }
}
