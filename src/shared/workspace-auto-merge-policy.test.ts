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

  it('turns the repairs back on every time auto-merge is switched on', () => {
    const stored = { enabled: false, resolveConflicts: false, fixFailingChecks: false }
    expect(enableAutoMergePolicy({ autoMerge: stored })).toEqual(DEFAULT_AUTO_MERGE_POLICY)
  })

  it('keeps merge method and attempt bookkeeping when switching on', () => {
    const stored = {
      enabled: false,
      resolveConflicts: false,
      fixFailingChecks: false,
      method: 'squash',
      attempts: { headOid: 'abc', conflicts: 1, checks: 2 }
    }
    expect(enableAutoMergePolicy({ autoMerge: stored })).toEqual({
      ...DEFAULT_AUTO_MERGE_POLICY,
      method: 'squash',
      attempts: { headOid: 'abc', conflicts: 1, checks: 2 }
    })
  })
})
