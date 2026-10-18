import { describe, expect, it } from 'vitest'
import { resolveWorktreeCardChips, WORKTREE_CARD_CHIP_LIMIT } from './worktree-card-chips'
import type { WorktreeCardController } from './use-worktree-card-controller'
import type { WorktreeCardProperty } from '../../../../shared/ui-chrome-types'
import type { GitConflictOperation } from '../../../../shared/git-status-types'

type CardStub = Pick<WorktreeCardController, 'cardProps' | 'prDisplay'> & {
  conflictOperation: GitConflictOperation | undefined
}

const CHIP_PROPERTIES: WorktreeCardProperty[] = ['blocker', 'conflict']

function makeCard(overrides: Partial<CardStub> = {}): WorktreeCardController {
  const card: CardStub = {
    cardProps: CHIP_PROPERTIES,
    conflictOperation: undefined,
    prDisplay: null,
    ...overrides
  }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the chip resolvers read only the three fields CardStub names.
  return card as WorktreeCardController
}

function review(overrides: Record<string, unknown> = {}): WorktreeCardController['prDisplay'] {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: a partial hosted review is all the resolvers read.
  return {
    provider: 'github',
    number: 1,
    title: 'PR',
    state: 'open',
    mergeable: 'MERGEABLE',
    ...overrides
  } as WorktreeCardController['prDisplay']
}

describe('worktree card chips', () => {
  it('renders nothing for a healthy workspace with no review', () => {
    expect(resolveWorktreeCardChips(makeCard())).toEqual([])
  })

  it('renders nothing when a review is open, green and on its base', () => {
    const chips = resolveWorktreeCardChips(
      makeCard({ prDisplay: review({ state: 'merged', status: 'success' }) })
    )

    expect(chips).toEqual([])
  })

  it('surfaces failing checks ahead of everything else', () => {
    const chips = resolveWorktreeCardChips(
      makeCard({ prDisplay: review({ status: 'failure' }), conflictOperation: 'merge' })
    )

    expect(chips.map((chip) => chip.id)).toEqual(['ci-failing', 'conflict'])
    expect(chips[0]?.tone).toBe('destructive')
  })

  it('reports a local merge conflict without a review', () => {
    const chips = resolveWorktreeCardChips(makeCard({ conflictOperation: 'merge' }))

    expect(chips.map((chip) => chip.id)).toEqual(['conflict'])
  })

  it('ignores rebase, which source control already owns', () => {
    expect(resolveWorktreeCardChips(makeCard({ conflictOperation: 'rebase' }))).toEqual([])
  })

  it('reports a review conflicting with its base', () => {
    const chips = resolveWorktreeCardChips(
      makeCard({ prDisplay: review({ mergeable: 'CONFLICTING' }) })
    )

    expect(chips.map((chip) => chip.id)).toEqual(['conflict'])
  })

  it('does not say "conflict" twice when the blocker is the conflict', () => {
    const chips = resolveWorktreeCardChips(makeCard({ conflictOperation: 'merge' }))

    expect(chips.filter((chip) => chip.id === 'conflict')).toHaveLength(1)
  })

  it('counts how far a branch is behind its base', () => {
    const chips = resolveWorktreeCardChips(
      makeCard({ prDisplay: review({ conflictSummary: { commitsBehind: 4 } }) })
    )

    expect(chips.map((chip) => chip.id)).toEqual(['stale'])
    expect(chips[0]?.label).toContain('4')
  })

  it('falls back to awaiting-review for an open, unblocked review', () => {
    const chips = resolveWorktreeCardChips(makeCard({ prDisplay: review() }))

    expect(chips.map((chip) => chip.id)).toEqual(['awaiting-review'])
    expect(chips[0]?.tone).toBe('muted')
  })

  it('omits chips whose property the user turned off', () => {
    const chips = resolveWorktreeCardChips(
      makeCard({ cardProps: ['status'], conflictOperation: 'merge' })
    )

    expect(chips).toEqual([])
  })

  it('keeps the rail within its budget', () => {
    const chips = resolveWorktreeCardChips(
      makeCard({ prDisplay: review({ status: 'failure' }), conflictOperation: 'merge' })
    )

    expect(chips.length).toBeLessThanOrEqual(WORKTREE_CARD_CHIP_LIMIT)
  })
})
