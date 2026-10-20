import { describe, expect, it } from 'vitest'
import { decideAutoMergeAction } from './auto-merge-decision'
import type { ReviewSnapshotPullRequest } from './github/review-status-snapshot-types'
import type { PRInfo } from './github/pull-request-types'
import { DEFAULT_AUTO_MERGE_POLICY } from './workspace-auto-merge-policy'

const openPR: Pick<
  ReviewSnapshotPullRequest,
  'state' | 'isDraft' | 'mergeable' | 'headRefOid' | 'checks'
> = {
  state: 'OPEN',
  isDraft: false,
  mergeable: 'MERGEABLE',
  headRefOid: 'aaa',
  checks: []
}
const waitingPR: PRInfo = {
  number: 1,
  title: 'PR',
  url: 'https://github.com/o/r/pull/1',
  checksStatus: 'pending',
  updatedAt: '2026-01-01T00:00:00Z',
  state: 'open',
  mergeable: 'MERGEABLE',
  mergeStateStatus: 'BLOCKED'
}

function decide(
  pr: Partial<typeof openPR> = {},
  policy = DEFAULT_AUTO_MERGE_POLICY,
  cachedPR: PRInfo | null = waitingPR
) {
  return decideAutoMergeAction({ policy, pr: { ...openPR, ...pr }, cachedPR })
}

describe('decideAutoMergeAction', () => {
  it('clears state once the PR is no longer open', () => {
    const policy = {
      ...DEFAULT_AUTO_MERGE_POLICY,
      attempts: { headOid: 'aaa', conflicts: 1, checks: 1 }
    }
    expect(decide({ state: 'MERGED' }, policy)).toMatchObject({
      action: 'none',
      attempts: undefined
    })
  })

  it('holds while GitHub recomputes mergeability', () => {
    expect(decide({ mergeable: 'UNKNOWN' }).action).toBe('none')
  })

  it('resolves conflicts before looking at checks, once per head', () => {
    const failing = [{ name: 'test', state: 'failure' as const }]
    const first = decide({ mergeable: 'CONFLICTING', checks: failing })
    expect(first.action).toBe('resolve-conflicts')
    const again = decide(
      { mergeable: 'CONFLICTING', checks: failing },
      { ...DEFAULT_AUTO_MERGE_POLICY, attempts: first.attempts }
    )
    expect(again.action).toBe('none')
  })

  it('fixes failing checks up to the per-head budget', () => {
    const checks = [{ name: 'test', state: 'failure' as const }]
    const first = decide({ checks })
    expect(first).toMatchObject({ action: 'fix-checks', failingChecks: ['test'] })
    const second = decide({ checks }, { ...DEFAULT_AUTO_MERGE_POLICY, attempts: first.attempts })
    expect(second.action).toBe('fix-checks')
    const third = decide({ checks }, { ...DEFAULT_AUTO_MERGE_POLICY, attempts: second.attempts })
    expect(third.action).toBe('enable-auto-merge')
    expect(third.attempts?.checks).toBe(2)
  })

  it('resets the budget when a new commit lands', () => {
    const policy = {
      ...DEFAULT_AUTO_MERGE_POLICY,
      attempts: { headOid: 'old', conflicts: 1, checks: 2 }
    }
    const next = decide({ checks: [{ name: 'test', state: 'failure' }] }, policy)
    expect(next.attempts).toEqual({ headOid: 'aaa', conflicts: 0, checks: 1 })
  })

  it('skips repairs the user switched off and re-asserts auto-merge', () => {
    const policy = { ...DEFAULT_AUTO_MERGE_POLICY, fixFailingChecks: false }
    expect(decide({ checks: [{ name: 'test', state: 'failure' }] }, policy).action).toBe(
      'enable-auto-merge'
    )
  })

  it('does nothing when GitHub auto-merge is already on', () => {
    expect(
      decide({}, DEFAULT_AUTO_MERGE_POLICY, { ...waitingPR, autoMergeEnabled: true }).action
    ).toBe('none')
  })
})
