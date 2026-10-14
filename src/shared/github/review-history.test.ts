import { describe, expect, it } from 'vitest'
import { buildReviewBaseOptions, buildViewerReviewHistory } from './review-history'

const reviews = [
  {
    login: 'frbarbre',
    state: 'CHANGES_REQUESTED',
    commitOid: 'bbb',
    submittedAt: '2026-09-20T10:00:00Z',
    isReplyOnly: false
  },
  {
    login: 'madsenmm',
    state: 'APPROVED',
    commitOid: 'ccc',
    submittedAt: '2026-09-21T10:00:00Z',
    isReplyOnly: false
  },
  {
    login: 'FrBarbre',
    state: 'COMMENTED',
    commitOid: 'old',
    submittedAt: '2026-09-18T10:00:00Z',
    isReplyOnly: false
  },
  {
    login: 'frbarbre',
    state: 'COMMENTED',
    commitOid: 'bbb',
    submittedAt: '2026-09-20T12:00:00Z',
    isReplyOnly: true
  },
  {
    login: 'frbarbre',
    state: 'PENDING',
    commitOid: 'ccc',
    submittedAt: '2026-09-22T10:00:00Z',
    isReplyOnly: false
  },
  {
    login: 'frbarbre',
    state: 'APPROVED',
    commitOid: 'ccc',
    submittedAt: '2026-09-23T10:00:00Z',
    isReplyOnly: false
  }
]

describe('buildViewerReviewHistory', () => {
  it('numbers your submitted reviews in the order you left them, skipping thread replies', () => {
    expect(
      buildViewerReviewHistory(reviews, 'frbarbre').map((r) => [r.ordinal, r.commitOid, r.state])
    ).toEqual([
      [1, 'old', 'COMMENTED'],
      [2, 'bbb', 'CHANGES_REQUESTED'],
      [3, 'ccc', 'APPROVED']
    ])
  })

  it('is empty without a known viewer', () => {
    expect(buildViewerReviewHistory(reviews, null)).toEqual([])
  })
})

describe('buildReviewBaseOptions', () => {
  const commits = [
    { oid: 'aaa', headline: 'first', committedAt: '2026-09-17T10:00:00Z' },
    { oid: 'bbb', headline: 'second', committedAt: '2026-09-19T10:00:00Z' },
    { oid: 'ccc', headline: 'third', committedAt: '2026-09-21T09:00:00Z' }
  ]

  it('lists commits newest first, tagged with the reviews you left on them', () => {
    const options = buildReviewBaseOptions(commits, buildViewerReviewHistory(reviews, 'frbarbre'))
    expect(options.map((o) => [o.id, o.reviewOrdinals])).toEqual([
      ['commit:ccc', [3]],
      ['commit:bbb', [2]],
      ['review:old', [1]],
      ['commit:aaa', []]
    ])
  })

  it('keeps a review whose commit a rebase removed, marked as off the branch', () => {
    const options = buildReviewBaseOptions(commits, buildViewerReviewHistory(reviews, 'frbarbre'))
    expect(options.find((o) => o.commitOid === 'old')).toMatchObject({ onBranch: false })
  })
})
