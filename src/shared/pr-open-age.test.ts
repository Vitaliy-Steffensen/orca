import { describe, expect, it } from 'vitest'
import { pullRequestOpenAgeDays } from './pr-open-age'

const NOW = Date.parse('2026-10-18T12:00:00.000Z')
const daysAgo = (days: number): string => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString()

describe('pullRequestOpenAgeDays', () => {
  it('stays quiet until the pull request has been open longer than 3 days', () => {
    expect(pullRequestOpenAgeDays(daysAgo(3), 'open', NOW)).toBeNull()
    expect(pullRequestOpenAgeDays(daysAgo(2), 'open', NOW)).toBeNull()
  })

  it('reports whole days once the pull request is older than 3 days', () => {
    expect(pullRequestOpenAgeDays(daysAgo(5), 'open', NOW)).toBe(5)
    expect(pullRequestOpenAgeDays(daysAgo(3.2), 'draft', NOW)).toBe(3)
  })

  it('ignores closed and merged reviews', () => {
    expect(pullRequestOpenAgeDays(daysAgo(12), 'merged', NOW)).toBeNull()
    expect(pullRequestOpenAgeDays(daysAgo(12), 'closed', NOW)).toBeNull()
    expect(pullRequestOpenAgeDays(undefined, 'open', NOW)).toBeNull()
  })
})
