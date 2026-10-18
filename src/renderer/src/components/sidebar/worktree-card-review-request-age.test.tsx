// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { setViewerReviewRequests } from '../workspace-status-rules/viewer-review-request-store'
import {
  reviewRequestAgeLabel,
  WorktreeCardReviewRequestAge
} from './worktree-card-review-request-age'

function renderBadge(enabled = true) {
  return render(
    <TooltipProvider>
      <WorktreeCardReviewRequestAge worktreeId="wt" enabled={enabled} />
    </TooltipProvider>
  )
}

const badge = (container: HTMLElement) =>
  container.querySelector('[data-worktree-card-review-request-age]')

describe('WorktreeCardReviewRequestAge', () => {
  afterEach(() => {
    cleanup()
    setViewerReviewRequests(new Map())
  })

  it('shows the age once the tick knows when the viewer was asked', () => {
    const { container } = renderBadge()
    expect(badge(container)).toBeNull()

    act(() =>
      setViewerReviewRequests(
        new Map([['wt', { requestedAt: Date.now() - 3_600_000, isReRequest: false }]])
      )
    )
    expect(badge(container)).toHaveTextContent('asked 1h')
  })

  it('says a re-request is one', () => {
    setViewerReviewRequests(
      new Map([['wt', { requestedAt: Date.now() - 120_000, isReRequest: true }]])
    )

    expect(badge(renderBadge().container)).toHaveTextContent('re-asked 2m')
  })

  it('stays hidden while the card option is off', () => {
    setViewerReviewRequests(new Map([['wt', { requestedAt: Date.now(), isReRequest: false }]]))

    expect(badge(renderBadge(false).container)).toBeNull()
  })
})

describe('reviewRequestAgeLabel', () => {
  it('counts in minutes, hours and days', () => {
    const now = Date.parse('2026-10-18T12:00:00Z')

    expect(reviewRequestAgeLabel(now - 60_000, false, now)).toBe('asked 1m')
    expect(reviewRequestAgeLabel(now - 3_600_000, false, now)).toBe('asked 1h')
    expect(reviewRequestAgeLabel(now - 86_400_000, true, now)).toBe('re-asked 1d')
  })
})
