import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AUTO_MERGE_POLICY,
  enableAutoMergePolicy,
  normalizeAutoMergePolicy,
  resolveAutoMergePolicy
} from './workspace-auto-merge-policy'

describe('workspace auto-merge policy', () => {
  it('reads an absent policy as off', () => {
    expect(resolveAutoMergePolicy({})).toEqual({
      enabled: false,
      resolveConflicts: false,
      fixFailingChecks: false
    })
    expect(resolveAutoMergePolicy(null).enabled).toBe(false)
  })

  it('rejects junk and keeps only known values', () => {
    expect(normalizeAutoMergePolicy('yes')).toBeUndefined()
    expect(
      normalizeAutoMergePolicy({
        enabled: true,
        resolveConflicts: 'true',
        method: 'fast-forward',
        attempts: { headOid: '', conflicts: 1 }
      })
    ).toEqual({ enabled: true, resolveConflicts: false, fixFailingChecks: false })
  })

  it('turns all three on the first time', () => {
    expect(enableAutoMergePolicy({})).toEqual(DEFAULT_AUTO_MERGE_POLICY)
  })

  it('keeps a sub-toggle the user turned off', () => {
    const stored = { enabled: false, resolveConflicts: true, fixFailingChecks: false }
    expect(enableAutoMergePolicy({ autoMerge: stored })).toEqual({ ...stored, enabled: true })
  })
})
