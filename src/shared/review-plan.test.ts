import { describe, expect, it } from 'vitest'
import { buildReviewPlanView, isReviewPlanStale, parseReviewPlan } from './review-plan'

const plan = {
  schema: 1,
  commit: 'abc1234',
  base: 'def5678',
  generatedAt: 1,
  groups: [
    { n: 2, title: 'Tests', files: ['a.test.ts'] },
    { n: 1, title: 'Worker injects clients', files: ['a.ts', 'b.ts'] }
  ],
  ratings: {
    'a.ts': { score: 0.9, reason: 'logic' },
    'b.ts': { score: 0.2, reason: 'rename' },
    'a.test.ts': { score: 0.5, reason: 'test' }
  }
}

describe('review plan', () => {
  it('parses a valid plan and rejects anything else', () => {
    expect(parseReviewPlan(JSON.stringify(plan))?.commit).toBe('abc1234')
    expect(parseReviewPlan('{"schema":2}')).toBeNull()
    expect(parseReviewPlan('not json')).toBeNull()
  })

  it('orders groups, applies the rating threshold and reports uncovered files', () => {
    const parsed = parseReviewPlan(JSON.stringify(plan))
    if (!parsed) {
      throw new Error('plan should parse')
    }
    const view = buildReviewPlanView(parsed, ['a.ts', 'b.ts', 'a.test.ts', 'new.ts'], 0.4)
    expect(view.groups.map((group) => [group.n, group.files, group.totalFiles])).toEqual([
      [1, ['a.ts'], 2],
      [2, ['a.test.ts'], 1]
    ])
    expect(view.notCovered).toEqual(['new.ts'])
  })

  it('is stale only when the head moved', () => {
    const parsed = parseReviewPlan(JSON.stringify(plan))
    if (!parsed) {
      throw new Error('plan should parse')
    }
    expect(isReviewPlanStale(parsed, 'abc1234')).toBe(false)
    expect(isReviewPlanStale(parsed, 'zzz')).toBe(true)
    expect(isReviewPlanStale(parsed, null)).toBe(false)
  })
})
