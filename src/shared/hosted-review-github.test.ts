import { describe, expect, it } from 'vitest'
import { hostedReviewInfoFromGitHubPRInfo } from './hosted-review-github'
import type { PRInfo } from './github/pull-request-types'

const pr: PRInfo = {
  number: 12,
  title: 'Add queue badges',
  state: 'open',
  url: 'https://github.com/acme/orca/pull/12',
  checksStatus: 'pending',
  updatedAt: '2026-05-12T00:00:00.000Z',
  mergeable: 'MERGEABLE',
  headSha: 'abc123'
}

describe('hostedReviewInfoFromGitHubPRInfo', () => {
  it('maps PRInfo into sidebar hosted review metadata', () => {
    const githubRepository = { owner: 'upstream', repo: 'orca' }
    const review = hostedReviewInfoFromGitHubPRInfo({ ...pr, prRepo: githubRepository })

    expect(review).toMatchObject({
      provider: 'github',
      number: 12,
      title: 'Add queue badges',
      state: 'open',
      status: 'pending',
      mergeable: 'MERGEABLE',
      headSha: 'abc123',
      githubRepository
    })
    expect(review.author).toBeUndefined()
  })

  it('keeps the pull request author so a sidebar card can show their face', () => {
    expect(hostedReviewInfoFromGitHubPRInfo({ ...pr, author: 'madsenmm' }).author).toBe('madsenmm')
  })

  it('keeps the diff, stack, and unresolved comments the sidebar card reads', () => {
    const review = hostedReviewInfoFromGitHubPRInfo({
      ...pr,
      createdAt: '2026-10-01T00:00:00.000Z',
      additions: 12,
      deletions: 3,
      changedFiles: 2,
      diffAreas: { fe: 10, be: 5, e2e: 0, ci: 0 },
      unresolvedComments: 4,
      stack: { number: 9, position: 2, size: 3, baseRefName: 'main' }
    })

    expect(review).toMatchObject({
      createdAt: '2026-10-01T00:00:00.000Z',
      additions: 12,
      deletions: 3,
      changedFiles: 2,
      unresolvedComments: 4,
      stack: { position: 2, size: 3 }
    })
  })
})
