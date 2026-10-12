// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { PendingReviewQueue } from '@/components/pending-review/use-pending-review-queue'
import { SourceControlPendingCommentsSection } from './pending-comments-section'

vi.mock('@/components/pending-review/use-github-viewer', () => ({
  useGitHubViewer: () => ({ login: 'frbarbre', avatarUrl: '' })
}))

afterEach(cleanup)

function renderSection(comments: PendingReviewQueue['comments'], collapsed = false) {
  const queue = { comments, updateBody: vi.fn(), remove: vi.fn() } as unknown as PendingReviewQueue
  const onToggle = vi.fn()
  const { container } = render(
    <TooltipProvider>
      <SourceControlPendingCommentsSection
        queue={queue}
        collapsed={collapsed}
        onToggle={onToggle}
      />
    </TooltipProvider>
  )
  return { container, onToggle }
}

describe('SourceControlPendingCommentsSection', () => {
  it('heads your unsent review comments with its own section header', () => {
    const { onToggle } = renderSection([
      { id: 'd1', path: 'a.ts', line: 3, body: 'Rename this', createdAt: 1 },
      { id: 'd2', path: 'b.ts', line: 9, body: 'Why here?', createdAt: 2 }
    ])
    const header = screen.getByRole('button', { name: /Pending review/ })
    expect(header.textContent).toContain('2')
    expect(screen.getByText('Rename this')).toBeInTheDocument()
    fireEvent.click(header)
    expect(onToggle).toHaveBeenCalled()
  })

  it('collapses to its header', () => {
    renderSection([{ id: 'd1', path: 'a.ts', line: 3, body: 'Rename this', createdAt: 1 }], true)
    expect(screen.queryByText('Rename this')).toBeNull()
  })

  it('is absent with nothing queued', () => {
    const { container } = renderSection([])
    expect(container.textContent).toBe('')
  })
})
