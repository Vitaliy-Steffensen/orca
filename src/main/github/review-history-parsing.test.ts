import { describe, expect, it } from 'vitest'
import { readReviewHistory } from './review-history-parsing'

function review(state: string, body: string, replyTos: (string | null)[]): unknown {
  return {
    state,
    body,
    submittedAt: '2026-09-20T10:00:00Z',
    author: { login: 'frbarbre' },
    commit: { oid: 'abc' },
    comments: { nodes: replyTos.map((id) => ({ replyTo: id ? { id } : null })) }
  }
}

describe('readReviewHistory', () => {
  it('marks a bodiless comment review made only of thread replies as reply-only', () => {
    const nodes = [
      review('COMMENTED', '', ['c1']),
      review('COMMENTED', '', ['c1', null]),
      review('COMMENTED', 'Looks close', ['c1']),
      review('APPROVED', '', ['c1']),
      review('COMMENTED', '  ', ['c1', 'c2'])
    ]
    expect(readReviewHistory({ nodes }).map((r) => r.isReplyOnly)).toEqual([
      true,
      false,
      false,
      false,
      true
    ])
  })
})
