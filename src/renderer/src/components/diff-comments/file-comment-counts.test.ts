import { describe, expect, it } from 'vitest'
import { buildPRFileCommentCounts, NO_FILE_COMMENT_COUNTS } from './file-comment-counts'
import type { PRComment } from '../../../../shared/github/comment-types'

function comment(overrides: Partial<PRComment>): PRComment {
  return {
    id: 1,
    author: 'a',
    authorAvatarUrl: '',
    body: 'b',
    createdAt: '',
    url: '',
    threadId: String(overrides.id ?? 1),
    ...overrides
  }
}

const PATH = 'src/a.ts'

describe('buildPRFileCommentCounts', () => {
  it('counts an unresolved thread against its file', () => {
    const counts = buildPRFileCommentCounts([comment({ id: 1, path: PATH })])
    expect(counts.get(PATH)).toEqual({
      notes: 0,
      agentNotes: 0,
      unresolvedThreads: 1,
      pendingReview: 0
    })
  })

  it('counts a thread once, however many replies it has', () => {
    const counts = buildPRFileCommentCounts([
      comment({ id: 1, path: PATH }),
      comment({ id: 2, path: PATH, threadId: '1' })
    ])
    expect(counts.get(PATH)?.unresolvedThreads).toBe(1)
  })

  it('leaves resolved and outdated threads out, so the badge matches what the diff shows', () => {
    const counts = buildPRFileCommentCounts([
      comment({ id: 1, path: PATH, isResolved: true }),
      comment({ id: 2, path: PATH, isOutdated: true })
    ])
    expect(counts.has(PATH)).toBe(false)
  })

  it('reports nothing for the kinds a pull request viewer has no workspace for', () => {
    const counts = buildPRFileCommentCounts([comment({ id: 1, path: PATH })])
    const entry = counts.get(PATH)
    expect(entry?.notes).toBe(0)
    expect(entry?.agentNotes).toBe(0)
    expect(entry?.pendingReview).toBe(0)
  })

  // Why identity and not just emptiness: every list memoizes on this map, and a fresh empty map
  // per render would invalidate them all.
  it('returns the shared empty map when nothing is outstanding', () => {
    expect(buildPRFileCommentCounts([])).toBe(NO_FILE_COMMENT_COUNTS)
  })
})
