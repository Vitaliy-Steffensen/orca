import { beforeEach, describe, expect, it } from 'vitest'
import { clearActiveGitStateCacheForTests, deriveGitState } from './right-sidebar-git-state'
import type { ActiveReviewResolution, ActiveReviewSnapshot } from './active-checks-status'

function review(overrides: Partial<ActiveReviewSnapshot> = {}): ActiveReviewSnapshot {
  return {
    state: 'open',
    checks: 'success',
    mergeable: 'MERGEABLE',
    reviewDecision: null,
    mergeStateStatus: null,
    ...overrides
  }
}

function resolution(
  value: ActiveReviewSnapshot | null,
  overrides: Partial<ActiveReviewResolution> = {}
): ActiveReviewResolution {
  return {
    worktreeId: 'wt-1',
    isFolderWorkspace: false,
    review: value,
    hasLinkedReview: false,
    ...overrides
  }
}

const pushed = { hasUpstream: true, ahead: 0, behind: 0 }
const unpushed = { hasUpstream: false, ahead: 0, behind: 0 }

function idFor(
  value: ActiveReviewSnapshot | null,
  extra: Partial<Parameters<typeof deriveGitState>[0]> = {}
): string | undefined {
  return deriveGitState({
    resolution: resolution(value),
    upstream: pushed,
    conflictOperation: undefined,
    ...extra
  })?.id
}

describe('deriveGitState', () => {
  beforeEach(() => {
    clearActiveGitStateCacheForTests()
  })

  it('is empty for folder workspaces and when nothing resolves', () => {
    expect(
      deriveGitState({ resolution: null, upstream: undefined, conflictOperation: undefined })
    ).toBe(null)
    expect(
      deriveGitState({
        resolution: resolution(review(), { isFolderWorkspace: true }),
        upstream: pushed,
        conflictOperation: undefined
      })
    ).toBe(null)
  })

  it('maps each state to its id and tone', () => {
    expect(idFor(review())).toBe('ready')
    expect(
      deriveGitState({
        resolution: resolution(review()),
        upstream: pushed,
        conflictOperation: undefined
      })?.tone
    ).toBe('success')
    expect(idFor(review({ state: 'merged' }))).toBe('merged')
    expect(idFor(review({ state: 'closed' }))).toBe('closed')
    expect(idFor(review({ state: 'draft' }))).toBe('draft')
    expect(idFor(review({ mergeable: 'CONFLICTING' }))).toBe('merge-conflicts')
    expect(idFor(review({ checks: 'failure' }))).toBe('ci-failed')
    expect(idFor(review({ reviewDecision: 'CHANGES_REQUESTED' }))).toBe('changes-requested')
    expect(idFor(review({ checks: 'pending' }))).toBe('ci-pending')
    expect(idFor(review({ reviewDecision: 'REVIEW_REQUIRED' }))).toBe('awaiting-review')
    expect(idFor(review({ mergeStateStatus: 'BEHIND' }))).toBe('behind')
  })

  it('ranks draft above conflicts and conflicts above failing CI', () => {
    expect(idFor(review({ state: 'draft', mergeable: 'CONFLICTING', checks: 'failure' }))).toBe(
      'draft'
    )
    expect(idFor(review({ mergeable: 'CONFLICTING', checks: 'failure' }))).toBe('merge-conflicts')
    expect(idFor(review({ checks: 'failure', reviewDecision: 'CHANGES_REQUESTED' }))).toBe(
      'ci-failed'
    )
  })

  it('shows conflicts for an in-progress local merge, with or without a PR', () => {
    expect(idFor(review(), { conflictOperation: 'merge' })).toBe('merge-conflicts')
    expect(idFor(null, { conflictOperation: 'rebase' })).toBe('merge-conflicts')
  })

  it('shows local only for an unpushed branch with no review', () => {
    expect(idFor(null, { upstream: unpushed })).toBe('local-only')
    expect(idFor(null, { upstream: pushed })).toBeUndefined()
    expect(idFor(null, { upstream: undefined })).toBeUndefined()
    expect(
      deriveGitState({
        resolution: resolution(null, { hasLinkedReview: true }),
        upstream: unpushed,
        conflictOperation: undefined
      })
    ).toBe(null)
  })

  it('stays silent while merge status is unknown', () => {
    expect(idFor(review({ mergeable: 'UNKNOWN' }))).toBeUndefined()
  })
})
