import { describe, expect, it } from 'vitest'
import type {
  ReviewSnapshotPullRequest,
  ReviewSnapshotReviewRequestEvent
} from './review-status-snapshot-types'
import { readViewerReviewRequest } from './viewer-review-request'

const FIRST = Date.parse('2026-10-16T09:00:00Z')
const SECOND = Date.parse('2026-10-17T09:00:00Z')

function pullRequest(
  reviewRequestEvents: ReviewSnapshotReviewRequestEvent[] | undefined,
  author = 'colleague'
): ReviewSnapshotPullRequest {
  return {
    repo: { owner: 'flowbasedk', repo: 'flowbase' },
    number: 12,
    title: 'A colleague change',
    url: 'https://github.com/flowbasedk/flowbase/pull/12',
    author,
    isDraft: false,
    state: 'OPEN',
    headRefName: 'feat/colleague',
    baseRefName: 'main',
    headRefOid: 'def456',
    requestedReviewers: [],
    latestReviews: [],
    checks: [],
    reviewRequestEvents
  }
}

const askedOnce: ReviewSnapshotReviewRequestEvent[] = [
  { reviewer: { kind: 'user', login: 'Viewer' }, requestedAt: FIRST }
]

describe('readViewerReviewRequest', () => {
  it('dates the request the viewer was named in', () => {
    expect(readViewerReviewRequest(pullRequest(askedOnce), 'viewer')).toEqual({
      requestedAt: FIRST,
      isReRequest: false
    })
  })

  it('restarts the clock on a re-request and still calls it one', () => {
    const events = [
      ...askedOnce,
      { reviewer: { kind: 'user', login: 'viewer' }, requestedAt: SECOND } as const
    ]

    expect(readViewerReviewRequest(pullRequest(events), 'viewer')).toEqual({
      requestedAt: SECOND,
      isReRequest: true
    })
  })

  it('ignores requests aimed at somebody else', () => {
    const events: ReviewSnapshotReviewRequestEvent[] = [
      { reviewer: { kind: 'user', login: 'someone-else' }, requestedAt: FIRST }
    ]

    expect(readViewerReviewRequest(pullRequest(events), 'viewer')).toBeNull()
  })

  it('falls back to a team request, which never names the member it reaches', () => {
    const events: ReviewSnapshotReviewRequestEvent[] = [
      { reviewer: { kind: 'user', login: 'someone-else' }, requestedAt: SECOND },
      { reviewer: { kind: 'team', slug: 'reviewers' }, requestedAt: FIRST }
    ]

    expect(readViewerReviewRequest(pullRequest(events), 'viewer')).toEqual({
      requestedAt: FIRST,
      isReRequest: false
    })
  })

  it('says nothing on the viewer’s own pull request, with no viewer, or with no events', () => {
    expect(readViewerReviewRequest(pullRequest(askedOnce, 'viewer'), 'viewer')).toBeNull()
    expect(readViewerReviewRequest(pullRequest(askedOnce), null)).toBeNull()
    expect(readViewerReviewRequest(pullRequest(undefined), 'viewer')).toBeNull()
  })
})
