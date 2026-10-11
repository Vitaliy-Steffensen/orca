// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PendingReviewPanelSection } from './PendingReviewPanelSection'

vi.mock('@/store', () => ({
  useAppStore: (select: (s: { activeWorktreeId: string }) => unknown) =>
    select({ activeWorktreeId: 'wt' })
}))
vi.mock('./use-pending-review-queue', () => ({
  usePendingReviewQueue: () => ({
    comments: [{ id: 'c1' }, { id: 'c2' }],
    updateBody: vi.fn(),
    remove: vi.fn()
  })
}))
vi.mock('./PendingReviewCommentCard', () => ({
  PendingReviewCommentCard: ({ comment }: { comment: { id: string } }) => (
    <div>draft {comment.id}</div>
  )
}))

afterEach(cleanup)

describe('PendingReviewPanelSection as a PR panel section', () => {
  it('heads the drafts with the shared section header, and collapses them', () => {
    render(<PendingReviewPanelSection sectionHeader />)
    const heading = screen.getByRole('button', { name: /Pending review/ })
    expect(heading.textContent).toContain('2')
    expect(screen.getByText('draft c1')).toBeTruthy()
    fireEvent.click(heading)
    expect(screen.queryByText('draft c1')).toBeNull()
  })
})
