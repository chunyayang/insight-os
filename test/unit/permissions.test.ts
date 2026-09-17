import { describe, expect, it } from 'vitest'
import {
  ABILITIES,
  DENIED_TREATMENT,
  PERMISSIONS,
  ROLES,
  roleCan,
  type Ability,
} from '../../app/constants/permissions'
import type { Role } from '../../app/types/api'

/**
 * The RBAC matrix transcribed straight from product spec §3. This table — not the
 * implementation — is the assertion: if someone widens a permission, this fails.
 * RBAC is security-shaped, so a regression here is a real bug, not cosmetic.
 */
const MATRIX: Record<Ability, Record<Role, boolean>> = {
  'analytics:view': { admin: true, analyst: true, viewer: true },
  'ai:chat': { admin: true, analyst: true, viewer: true },
  'export:csv': { admin: true, analyst: true, viewer: false },
  'campaigns:manage': { admin: true, analyst: true, viewer: false },
  'datasources:manage': { admin: true, analyst: false, viewer: false },
  'team:manage': { admin: true, analyst: false, viewer: false },
  'settings:admin': { admin: true, analyst: false, viewer: false },
}

describe('RBAC matrix (spec §3)', () => {
  it.each(Object.keys(MATRIX) as Ability[])('grants %s to exactly the right roles', (ability) => {
    for (const role of ROLES) {
      expect(roleCan(role, ability)).toBe(MATRIX[ability][role])
    }
  })

  it('covers every declared ability — no permission left untested', () => {
    expect([...ABILITIES].sort()).toEqual(Object.keys(MATRIX).sort())
  })

  it('admin can do everything', () => {
    for (const ability of ABILITIES) expect(roleCan('admin', ability)).toBe(true)
  })

  it('viewer is read-only: no management or export capability', () => {
    const forbidden: Ability[] = [
      'export:csv',
      'campaigns:manage',
      'datasources:manage',
      'team:manage',
      'settings:admin',
    ]
    for (const ability of forbidden) expect(roleCan('viewer', ability)).toBe(false)
    // …but retains the read/ask capabilities.
    expect(roleCan('viewer', 'analytics:view')).toBe(true)
    expect(roleCan('viewer', 'ai:chat')).toBe(true)
  })

  it('analyst is blocked from admin-only surfaces', () => {
    for (const ability of ['datasources:manage', 'team:manage', 'settings:admin'] as Ability[]) {
      expect(roleCan('analyst', ability)).toBe(false)
    }
  })
})

describe('denied-ability treatment', () => {
  /**
   * *(Hidden)* must mean hidden, not merely disabled — disabling would leak the
   * existence of features a role isn't entitled to see. Only CSV export is the
   * spec's "visible but inert + tooltip" case.
   */
  it('hides everything except CSV export, which is disabled with a tooltip', () => {
    expect(DENIED_TREATMENT['export:csv']).toBe('disabled')
    for (const ability of ABILITIES.filter((a) => a !== 'export:csv')) {
      expect(DENIED_TREATMENT[ability]).toBe('hidden')
    }
  })

  it('declares a treatment for every ability', () => {
    expect(Object.keys(DENIED_TREATMENT).sort()).toEqual([...ABILITIES].sort())
  })
})

describe('permission map integrity', () => {
  it('only references known roles', () => {
    for (const roles of Object.values(PERMISSIONS)) {
      for (const role of roles) expect(ROLES).toContain(role)
    }
  })

  it('grants every ability to at least one role', () => {
    for (const ability of ABILITIES) {
      expect(ROLES.some((r) => roleCan(r, ability))).toBe(true)
    }
  })
})
