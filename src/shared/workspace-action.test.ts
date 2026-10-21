import { describe, expect, it } from 'vitest'
import { resolveWorkspaceActions, type WorkspaceActionInput } from './workspace-action'

const clean: WorkspaceActionInput = {
  hasUncommittedChanges: false,
  hasUpstream: true,
  unpushedCommits: 0,
  hasLocalConflicts: false,
  isDefaultBranch: false,
  pullRequest: null,
  pullRequestKnown: true,
  hasDiffFromBase: true,
  branchDiffKnown: true
}

describe('resolveWorkspaceActions', () => {
  it('leads with create PR over commit & push when the branch has no pull request', () => {
    expect(resolveWorkspaceActions({ ...clean, hasUncommittedChanges: true })).toEqual([
      'create-pull-request',
      'create-draft-pull-request',
      'commit-and-push'
    ])
    expect(resolveWorkspaceActions({ ...clean, unpushedCommits: 2 })).toEqual([
      'create-pull-request',
      'create-draft-pull-request',
      'commit-and-push'
    ])
  })

  it('offers commit & push alone until the pull request lookup has answered', () => {
    const unknown = { ...clean, pullRequestKnown: false }
    expect(resolveWorkspaceActions({ ...unknown, hasUncommittedChanges: true })).toEqual([
      'commit-and-push'
    ])
    expect(resolveWorkspaceActions(unknown)).toEqual([])
  })

  it('leads with commit & push over the pull request steps', () => {
    const pullRequest = { state: 'draft' as const, conflicting: false }
    expect(resolveWorkspaceActions({ ...clean, hasUncommittedChanges: true, pullRequest })).toEqual(
      ['commit-and-push', 'ready-for-review', 'review', 're-review']
    )
    expect(resolveWorkspaceActions({ ...clean, unpushedCommits: 2, pullRequest })).toEqual([
      'commit-and-push',
      'ready-for-review',
      'review',
      're-review'
    ])
  })

  it('leads with conflicts, then ready for review, then review', () => {
    expect(
      resolveWorkspaceActions({ ...clean, pullRequest: { state: 'draft', conflicting: true } })
    ).toEqual(['resolve-conflicts', 'ready-for-review', 'review', 're-review'])
    expect(
      resolveWorkspaceActions({ ...clean, pullRequest: { state: 'draft', conflicting: false } })
    ).toEqual(['ready-for-review', 'review', 're-review'])
    expect(resolveWorkspaceActions(clean)).toEqual([
      'create-pull-request',
      'create-draft-pull-request'
    ])
  })

  it('puts a merge stopped on conflicts first, since it cannot be committed', () => {
    expect(
      resolveWorkspaceActions({ ...clean, hasLocalConflicts: true, hasUncommittedChanges: true })[0]
    ).toBe('resolve-conflicts')
  })

  it('offers review on an open, clean pull request and nothing on a merged one', () => {
    expect(
      resolveWorkspaceActions({ ...clean, pullRequest: { state: 'open', conflicting: false } })
    ).toEqual(['review', 're-review'])
    expect(
      resolveWorkspaceActions({ ...clean, pullRequest: { state: 'merged', conflicting: false } })
    ).toEqual([])
    expect(resolveWorkspaceActions({ ...clean, isDefaultBranch: true })).toEqual([])
  })

  it('drops review when the branch has no diff from its base', () => {
    const pullRequest = { state: 'open' as const, conflicting: false }
    expect(resolveWorkspaceActions({ ...clean, pullRequest, hasDiffFromBase: false })).toEqual([])
    expect(
      resolveWorkspaceActions({
        ...clean,
        pullRequest: { state: 'draft', conflicting: false },
        hasDiffFromBase: false
      })
    ).toEqual(['ready-for-review'])
  })

  it('keeps review while the line total is still loading', () => {
    expect(
      resolveWorkspaceActions({
        ...clean,
        pullRequest: { state: 'open', conflicting: false },
        hasDiffFromBase: false,
        branchDiffKnown: false
      })
    ).toEqual(['review', 're-review'])
  })

  it('does not count commits as unpushed when the branch has no upstream yet', () => {
    expect(resolveWorkspaceActions({ ...clean, hasUpstream: false, unpushedCommits: 3 })).toEqual([
      'create-pull-request',
      'create-draft-pull-request'
    ])
  })
})
