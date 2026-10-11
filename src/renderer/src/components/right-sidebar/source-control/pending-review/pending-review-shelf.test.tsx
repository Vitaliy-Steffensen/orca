// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { PendingReviewQueue } from '@/components/pending-review/use-pending-review-queue'
import type { ReviewVerdictSubmitter } from '@/components/pending-review/use-submit-review-verdict'
import { SourceControlPendingReviewShelf } from './pending-review-shelf'

vi.mock('@/components/pending-review/use-review-diff-base', () => ({
  useReviewDiffBase: () => ({ available: false })
}))
vi.mock('@/components/pending-review/pending-review-summary-store', () => ({
  usePendingReviewSummary: () => ['', vi.fn()]
}))
vi.mock('@/components/github/ReviewMarkdownComposer', () => ({
  ReviewMarkdownComposer: ({ placeholder }: { placeholder: string }) => (
    <textarea placeholder={placeholder} />
  )
}))

afterEach(cleanup)

function renderShelf(collapsed: boolean) {
  const queue = {
    comments: [],
    updateBody: vi.fn(),
    remove: vi.fn()
  } as unknown as PendingReviewQueue
  const submitter = {
    prNumber: 7,
    reviewers: [
      {
        kind: 'user',
        login: 'MartinBernstorff',
        name: null,
        avatarUrl: null,
        state: 'pending',
        canRerequest: false
      }
    ],
    rerequest: vi.fn(),
    viewerDidAuthor: false,
    viewerLatestReviewState: null,
    viewerHasReviewRequest: false,
    commits: [],
    viewerReviews: [],
    baseRefName: 'main',
    submit: vi.fn()
  } as unknown as ReviewVerdictSubmitter
  render(
    <TooltipProvider>
      <SourceControlPendingReviewShelf
        queue={queue}
        submitter={submitter}
        worktreeId="wt"
        collapsed={collapsed}
        onToggle={vi.fn()}
      />
    </TooltipProvider>
  )
}

describe('SourceControlPendingReviewShelf', () => {
  it('is one Review section holding the reviewers and the review form', () => {
    renderShelf(false)
    expect(screen.getByRole('button', { name: /Review/ })).toBeInTheDocument()
    expect(screen.getByText('MartinBernstorff')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Add review summary…')).toBeInTheDocument()
  })

  it('collapses to its header', () => {
    renderShelf(true)
    expect(screen.queryByText('MartinBernstorff')).toBeNull()
    expect(screen.queryByPlaceholderText('Add review summary…')).toBeNull()
  })
})
