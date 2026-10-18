import { describe, expect, it } from 'vitest'
import type { Worktree } from '../../../../shared/worktree/types'
import { getWorkspaceReferenceOpenTargets } from './workspace-reference-open-targets'

const workspace: Worktree = {
  id: 'repo::/repo/feature',
  repoId: 'repo',
  path: '/repo/feature',
  displayName: 'Feature',
  branch: 'feature',
  head: 'abc',
  isBare: false,
  isMainWorktree: false,
  isArchived: false,
  isPinned: false,
  isUnread: false,
  sortOrder: 0,
  lastActivityAt: 1,
  comment: '',
  linkedIssue: null,
  linkedLinearIssue: null,
  linkedPR: null
}

describe('workspace reference open targets', () => {
  it('lists reviews before issues and labels them by provider', () => {
    const targets = getWorkspaceReferenceOpenTargets({
      ...workspace,
      linkedItems: [
        {
          provider: 'linear',
          type: 'issue',
          number: 0,
          identifier: 'ORC-912',
          linearOrganizationUrlKey: 'acme'
        },
        {
          provider: 'github',
          type: 'pr',
          number: 57,
          url: 'https://github.com/acme/orca/pull/57'
        }
      ]
    })
    expect(targets.map((target) => [target.label, target.url])).toEqual([
      ['GitHub PR #57', 'https://github.com/acme/orca/pull/57'],
      ['Linear ORC-912', 'https://linear.app/acme/issue/ORC-912']
    ])
  })

  it('drops references with no reachable URL', () => {
    const targets = getWorkspaceReferenceOpenTargets({
      ...workspace,
      linkedItems: [{ provider: 'linear', type: 'issue', number: 0, identifier: 'ORC-912' }]
    })
    expect(targets).toEqual([])
  })

  it('returns nothing without a workspace', () => {
    expect(getWorkspaceReferenceOpenTargets(undefined)).toEqual([])
  })
})
