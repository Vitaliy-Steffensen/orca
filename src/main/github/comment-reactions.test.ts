import { describe, expect, it } from 'vitest'

import { mapGraphQLReactionGroups, toGraphQLReactionContent } from './comment-reactions'

describe('mapGraphQLReactionGroups', () => {
  it('normalizes GraphQL reaction groups into GitHub comment reactions', () => {
    expect(
      mapGraphQLReactionGroups([
        { content: 'EYES', reactors: { totalCount: 1 }, viewerHasReacted: false },
        { content: 'THUMBS_UP', reactors: { totalCount: 2 }, viewerHasReacted: true },
        { content: 'HEART', reactors: { totalCount: 0 } },
        { content: 'UNKNOWN', reactors: { totalCount: 9 } }
      ])
    ).toEqual([
      { content: '+1', count: 2, viewerHasReacted: true },
      { content: 'eyes', count: 1, viewerHasReacted: false }
    ])
  })

  it('keeps the logins of the first reactors so a chip can say who reacted', () => {
    expect(
      mapGraphQLReactionGroups([
        {
          content: 'THUMBS_UP',
          reactors: { totalCount: 4, nodes: [{ login: 'alice' }, { login: 'bob' }, null] }
        }
      ])
    ).toEqual([{ content: '+1', count: 4, reactors: ['alice', 'bob'] }])
  })

  it('asks GitHub for the first reactors of every reaction group', async () => {
    const { REVIEW_THREADS_QUERY } = await import('./client/fetch/pr-review-threads-query')
    const groups = REVIEW_THREADS_QUERY.match(
      /reactors\(first: \d+\) \{[^}]*nodes \{ \.\.\. on Actor \{ login \} \}/g
    )
    expect(groups).toHaveLength(3)
  })

  it('returns undefined when there are no visible reactions', () => {
    expect(mapGraphQLReactionGroups([{ content: 'ROCKET', reactors: { totalCount: 0 } }])).toBe(
      undefined
    )
  })

  it('maps REST reaction content to the GraphQL enum', () => {
    expect(toGraphQLReactionContent('+1')).toBe('THUMBS_UP')
    expect(toGraphQLReactionContent('hooray')).toBe('HOORAY')
  })
})
