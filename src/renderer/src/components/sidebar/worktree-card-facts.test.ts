import { describe, expect, it } from 'vitest'
import { resolveWorktreeCardFacts } from './worktree-card-facts'
import type { WorktreeCardProperty } from '../../../../shared/ui-chrome-types'

const PROPERTIES: WorktreeCardProperty[] = [
  'diff',
  'diff-mix',
  'linear-priority',
  'stack',
  'unresolved-comments',
  'pr-open-age'
]

const NOW = Date.parse('2026-10-18T12:00:00.000Z')

describe('resolveWorktreeCardFacts', () => {
  it('renders nothing for a workspace with no review and no priority', () => {
    expect(resolveWorktreeCardFacts({ cardProps: PROPERTIES, review: null, now: NOW })).toEqual([])
  })

  it('shows the diff, the mix, a stack, unresolved comments, and an old pull request', () => {
    const facts = resolveWorktreeCardFacts({
      cardProps: PROPERTIES,
      now: NOW,
      linearPriority: 2,
      review: {
        state: 'open',
        createdAt: '2026-10-10T12:00:00.000Z',
        additions: 40,
        deletions: 8,
        changedFiles: 3,
        diffAreas: { fe: 30, be: 10, e2e: 6, ci: 2 },
        stack: { number: 4, position: 2, size: 4, baseRefName: 'main' },
        unresolvedComments: 3
      }
    })

    expect(facts.map((fact) => fact.id)).toEqual([
      'diff',
      'diff-mix',
      'linear-priority',
      'stack',
      'unresolved-comments',
      'pr-open-age'
    ])
    expect(facts[0]).toMatchObject({ added: 40, removed: 8, files: 3 })
    expect(facts.find((fact) => fact.id === 'linear-priority')).toMatchObject({ label: 'high' })
    expect(facts.find((fact) => fact.id === 'stack')).toMatchObject({ position: 2, size: 4 })
    expect(facts.find((fact) => fact.id === 'pr-open-age')).toMatchObject({ days: 8 })
  })

  it('hides a healthy review: no priority, no stack, no comments, opened today', () => {
    expect(
      resolveWorktreeCardFacts({
        cardProps: PROPERTIES,
        now: NOW,
        linearPriority: 0,
        review: {
          state: 'open',
          createdAt: '2026-10-18T08:00:00.000Z',
          additions: 0,
          deletions: 0,
          stack: { number: 1, position: 1, size: 1, baseRefName: 'main' },
          unresolvedComments: 0
        }
      })
    ).toEqual([])
  })

  it('falls back to the local branch total when GitHub has not reported a size', () => {
    const facts = resolveWorktreeCardFacts({
      cardProps: PROPERTIES,
      review: { state: 'open' },
      branchLineTotal: {
        added: 5,
        removed: 1,
        mergeBase: 'abc1234',
        files: { 'src/App.tsx': { added: 5, removed: 1 } }
      }
    })

    expect(facts.map((fact) => fact.id)).toEqual(['diff', 'diff-mix'])
    expect(facts[1]).toMatchObject({ areas: { fe: 6, be: 0, e2e: 0, ci: 0 } })
  })

  it('omits a fact whose property is turned off', () => {
    const facts = resolveWorktreeCardFacts({
      cardProps: ['status'],
      now: NOW,
      linearPriority: 1,
      review: {
        state: 'open',
        createdAt: '2026-10-01T12:00:00.000Z',
        additions: 9,
        deletions: 1,
        unresolvedComments: 4,
        stack: { number: 2, position: 1, size: 2, baseRefName: 'main' }
      }
    })

    expect(facts).toEqual([])
  })
})
