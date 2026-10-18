// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { WorktreeCardReviewFacts } from './worktree-card-review-facts'
import type { WorktreeCardController } from './use-worktree-card-controller'

function renderFacts(
  review: WorktreeCardController['prDisplay'],
  linearPriority?: number
): HTMLElement {
  const card = {
    cardProps: [
      'diff',
      'diff-mix',
      'linear-priority',
      'stack',
      'unresolved-comments',
      'pr-open-age'
    ],
    prDisplay: review,
    linearIssue: linearPriority === undefined ? null : { priority: linearPriority },
    branchLineTotal: null
  } as WorktreeCardController
  const view = render(
    <TooltipProvider>
      <WorktreeCardReviewFacts card={card} />
    </TooltipProvider>
  )
  return view.container
}

describe('WorktreeCardReviewFacts', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the diff, pie, priority, stack, comments, and age together', () => {
    const container = renderFacts(
      {
        provider: 'github',
        number: 12,
        title: 'PR',
        state: 'open',
        url: 'https://github.com/acme/orca/pull/12',
        status: 'success',
        updatedAt: '2026-10-18T00:00:00.000Z',
        mergeable: 'MERGEABLE',
        createdAt: '2026-10-01T00:00:00.000Z',
        additions: 40,
        deletions: 8,
        diffAreas: { fe: 30, be: 10, e2e: 6, ci: 2 },
        stack: { number: 4, position: 2, size: 4, baseRefName: 'main' },
        unresolvedComments: 3
      },
      2
    )

    expect(container.querySelector('[data-worktree-card-fact="diff"]')).toHaveTextContent('+40')
    expect(container.querySelector('[data-worktree-card-fact="diff"]')).toHaveTextContent('−8')
    expect(container.querySelector('[data-worktree-card-fact="diff-mix"]')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Frontend')
    )
    expect(container.querySelector('[data-worktree-card-fact="linear-priority"]')).toHaveTextContent(
      'High'
    )
    expect(container.querySelector('[data-worktree-card-fact="stack"]')).toHaveTextContent('2/4')
    expect(
      container.querySelector('[data-worktree-card-fact="unresolved-comments"]')
    ).toHaveTextContent('3')
    expect(container.querySelector('[data-worktree-card-fact="pr-open-age"]')).toHaveTextContent(
      /^\d+d$/
    )
  })

  it('renders nothing when the review has nothing to flag', () => {
    const container = renderFacts({
      provider: 'github',
      number: 1,
      title: 'PR',
      state: 'open',
      url: '',
      status: 'success',
      updatedAt: new Date().toISOString(),
      mergeable: 'MERGEABLE',
      createdAt: new Date().toISOString(),
      additions: 0,
      deletions: 0,
      unresolvedComments: 0,
      stack: { number: 1, position: 1, size: 1, baseRefName: 'main' }
    })

    expect(container.querySelector('[data-worktree-card-facts]')).toBeNull()
  })
})
