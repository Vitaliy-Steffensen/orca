import { describe, expect, it } from 'vitest'
import type { ReviewSnapshotPullRequest } from './github/review-status-snapshot-types'
import { DEFAULT_MERGING_CHECK_NAME } from './workspace-status-rule-config'
import { lowercaseLoginSet, resolveWorkspaceStatusRuleCondition } from './workspace-status-rules'

function makePR(overrides: Partial<ReviewSnapshotPullRequest> = {}): ReviewSnapshotPullRequest {
  return {
    repo: { owner: 'flowbasedk', repo: 'flowbase' },
    number: 1,
    title: 'Add a thing',
    url: 'https://github.com/flowbasedk/flowbase/pull/1',
    author: 'frbarbre',
    isDraft: false,
    state: 'OPEN',
    headRefName: 'feat/thing',
    baseRefName: 'main',
    headRefOid: 'abc123',
    requestedReviewers: [],
    latestReviews: [],
    checks: [],
    ...overrides
  }
}

const noPmTeam = lowercaseLoginSet([])
const viewer = 'frbarbre'
const base = { mergingCheckName: DEFAULT_MERGING_CHECK_NAME }
const mapped = {
  ...base,
  statusByCondition: { approved: 'ready-to-merge', 'awaiting-review': 'waiting-for-review' }
}

describe('approved', () => {
  it('reports approved when everyone asked has approved and there is no conflict', () => {
    const pr = makePR({
      latestReviews: [{ login: 'colleague', state: 'APPROVED', commitOid: 'abc123' }]
    })

    expect(resolveWorkspaceStatusRuleCondition(pr, mapped, noPmTeam, viewer)).toBe('approved')
  })

  it('does not report approved while a reviewer is still pending', () => {
    const pr = makePR({
      requestedReviewers: [{ kind: 'user', login: 'colleague' }],
      latestReviews: [{ login: 'other', state: 'APPROVED', commitOid: 'abc123' }]
    })

    expect(resolveWorkspaceStatusRuleCondition(pr, mapped, noPmTeam, viewer)).toBe(
      'awaiting-review'
    )
  })

  it('does not report approved on a conflicting pull request', () => {
    const pr = makePR({
      mergeable: 'CONFLICTING',
      latestReviews: [{ login: 'colleague', state: 'APPROVED', commitOid: 'abc123' }]
    })

    expect(resolveWorkspaceStatusRuleCondition(pr, mapped, noPmTeam, viewer)).toBe('review')
  })

  it('leaves an install that never mapped it on the condition it had', () => {
    const pr = makePR({
      latestReviews: [{ login: 'colleague', state: 'APPROVED', commitOid: 'abc123' }]
    })

    expect(resolveWorkspaceStatusRuleCondition(pr, base, noPmTeam, viewer)).toBe('review')
  })
})

describe('awaiting-review', () => {
  it('reports it for your own open pull request with reviewers still to answer', () => {
    const pr = makePR({ requestedReviewers: [{ kind: 'user', login: 'colleague' }] })

    expect(resolveWorkspaceStatusRuleCondition(pr, mapped, noPmTeam, viewer)).toBe(
      'awaiting-review'
    )
  })

  it("never claims someone else's pull request, which is still yours to review", () => {
    const pr = makePR({
      author: 'colleague',
      requestedReviewers: [{ kind: 'user', login: viewer }]
    })

    expect(resolveWorkspaceStatusRuleCondition(pr, mapped, noPmTeam, viewer)).toBe('reviewing')
  })

  it('leaves an install that never mapped it reporting review', () => {
    const pr = makePR({ requestedReviewers: [{ kind: 'user', login: 'colleague' }] })

    expect(resolveWorkspaceStatusRuleCondition(pr, base, noPmTeam, viewer)).toBe('review')
  })
})
