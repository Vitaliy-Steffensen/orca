import { describe, expect, it } from 'vitest'
import { formatCommentReactors } from './comment-reactors-label'

describe('formatCommentReactors', () => {
  it('names who reacted, and counts the rest', () => {
    expect(formatCommentReactors({ content: '+1', count: 1, reactors: ['alice'] })).toBe(
      'alice reacted with 👍'
    )
    expect(formatCommentReactors({ content: '+1', count: 2, reactors: ['alice', 'bob'] })).toBe(
      'alice and bob reacted with 👍'
    )
    expect(
      formatCommentReactors({ content: 'heart', count: 5, reactors: ['alice', 'bob', 'cara'] })
    ).toBe('alice, bob, cara and 2 others reacted with ❤️')
  })

  it('says nothing when GitHub sent no names', () => {
    expect(formatCommentReactors({ content: '+1', count: 2 })).toBeNull()
  })
})
