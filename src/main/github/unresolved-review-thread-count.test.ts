import { describe, expect, it } from 'vitest'
import { countUnresolvedReviewThreads } from './unresolved-review-thread-count'

describe('countUnresolvedReviewThreads', () => {
  it('counts threads that are still open and ignores resolved ones', () => {
    expect(
      countUnresolvedReviewThreads({
        data: {
          repository: {
            pullRequest: {
              reviewThreads: {
                pageInfo: { hasNextPage: false },
                nodes: [{ isResolved: false }, { isResolved: true }, null, {}]
              }
            }
          }
        }
      })
    ).toEqual({ count: 2, truncated: false })
  })

  it('marks the count as incomplete when another page exists', () => {
    expect(
      countUnresolvedReviewThreads({
        data: {
          repository: {
            pullRequest: {
              reviewThreads: {
                pageInfo: { hasNextPage: true },
                nodes: [{ isResolved: false }]
              }
            }
          }
        }
      }).truncated
    ).toBe(true)
  })

  it('returns zero when the pull request has no threads', () => {
    expect(countUnresolvedReviewThreads({})).toEqual({ count: 0, truncated: false })
  })
})
