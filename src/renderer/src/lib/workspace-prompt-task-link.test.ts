import { describe, expect, it } from 'vitest'
import type { Repo } from '../../../shared/repo-types'
import type { Worktree } from '../../../shared/worktree/types'
import {
  extractWorkspacePromptTaskLink,
  findWorkspaceForPromptTaskLink
} from './workspace-prompt-task-link'

function worktree(overrides: Partial<Worktree> & Pick<Worktree, 'id'>): Worktree {
  return {
    repoId: 'repo-1',
    displayName: overrides.id,
    comment: '',
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 1,
    ...overrides
  } as Worktree
}

const repos = new Map<string, Repo>([
  ['repo-1', { id: 'repo-1', displayName: 'acme/api', path: '/api' } as Repo]
])

describe('extractWorkspacePromptTaskLink', () => {
  it('reads a GitHub pull request out of a longer prompt', () => {
    expect(
      extractWorkspacePromptTaskLink(
        'please look at https://github.com/acme/api/pull/5123 and fix the race'
      )
    ).toMatchObject({
      kind: 'github',
      link: { number: 5123, type: 'pr', slug: { owner: 'acme', repo: 'api' } }
    })
  })

  it('reads a Linear issue URL', () => {
    expect(
      extractWorkspacePromptTaskLink('https://linear.app/stably/issue/STA-4084/restore-shell')
    ).toMatchObject({
      kind: 'linear',
      intent: { identifier: 'STA-4084', organizationUrlKey: 'stably' }
    })
  })

  it('reads a Linear review URL and the issue key embedded in its slug', () => {
    expect(
      extractWorkspacePromptTaskLink('https://linear.app/stably/review/sta-4084-restore-shell.')
    ).toMatchObject({
      kind: 'linear-review',
      intent: { organizationUrlKey: 'stably', reviewId: 'sta-4084-restore-shell' },
      issue: { identifier: 'STA-4084', organizationUrlKey: 'stably' }
    })
  })

  it('ignores text that is not a task URL', () => {
    expect(extractWorkspacePromptTaskLink('fix the login redirect')).toBeNull()
  })
})

describe('findWorkspaceForPromptTaskLink', () => {
  it('prefers a live workspace over an archived one for the same issue', () => {
    const link = extractWorkspacePromptTaskLink('https://linear.app/stably/issue/STA-12')
    const archived = worktree({
      id: 'old',
      isArchived: true,
      lastActivityAt: 50,
      linkedLinearIssue: 'STA-12',
      linkedLinearIssueOrganizationUrlKey: 'stably'
    })
    const live = worktree({
      id: 'live',
      lastActivityAt: 5,
      linkedLinearIssue: 'STA-12',
      linkedLinearIssueOrganizationUrlKey: 'stably'
    })
    expect(
      findWorkspaceForPromptTaskLink({ link: link!, worktrees: [archived, live], reposById: repos })
        ?.id
    ).toBe('live')
  })

  it('returns an archived workspace when that is the only match', () => {
    const link = extractWorkspacePromptTaskLink('https://github.com/acme/api/pull/7')
    const archived = worktree({
      id: 'archived-pr',
      isArchived: true,
      linkedPR: 7,
      linkedWorkItem: {
        provider: 'github',
        type: 'pr',
        number: 7,
        title: 'Fix',
        url: 'https://github.com/acme/api/pull/7'
      }
    })
    expect(
      findWorkspaceForPromptTaskLink({
        link: link!,
        worktrees: [archived],
        reposById: repos
      })?.id
    ).toBe('archived-pr')
  })

  it('matches a Linear review URL stored on a workspace', () => {
    const link = extractWorkspacePromptTaskLink('https://linear.app/stably/review/review-9')
    const archived = worktree({
      id: 'review',
      isArchived: true,
      linkedItems: [
        {
          provider: 'linear',
          type: 'issue',
          number: 0,
          identifier: 'STA-9',
          url: 'https://linear.app/stably/review/review-9'
        }
      ]
    })
    expect(
      findWorkspaceForPromptTaskLink({ link: link!, worktrees: [archived], reposById: repos })?.id
    ).toBe('review')
  })
})
