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
  const accept = vi.fn()
  const remove = vi.fn()
  const queue: PendingReviewQueue = {
    comments,
    add: vi.fn(),
    updateBody: vi.fn(),
    remove,
    accept,
    acceptAll: vi.fn(),
    discardProposals: vi.fn(),
    keepProposals: vi.fn(),
    clear: vi.fn()
  }
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
  return { container, onToggle, accept, remove }
}

describe('SourceControlPendingCommentsSection', () => {
  it('heads your unsent review comments with its own section header', () => {
    const { onToggle } = renderSection([
      { id: 'd1', path: 'a.ts', line: 3, body: 'Rename this', createdAt: 1, status: 'accepted' },
      { id: 'd2', path: 'b.ts', line: 9, body: 'Why here?', createdAt: 2, status: 'accepted' }
    ])
    const header = screen.getByRole('button', { name: /Pending review/ })
    expect(header.textContent).toContain('2')
    expect(screen.getByText('Rename this')).toBeInTheDocument()
    fireEvent.click(header)
    expect(onToggle).toHaveBeenCalled()
  })

  it('collapses to its header', () => {
    renderSection(
      [{ id: 'd1', path: 'a.ts', line: 3, body: 'Rename this', createdAt: 1, status: 'accepted' }],
      true
    )
    expect(screen.queryByText('Rename this')).toBeNull()
  })

  it('is absent with nothing queued', () => {
    const { container } = renderSection([])
    expect(container.textContent).toBe('')
  })

  it('offers accept and reject on an agent’s proposal, and on nothing else', () => {
    const { accept, remove } = renderSection([
      { id: 'mine', path: 'a.ts', line: 3, body: 'Rename this', createdAt: 1, status: 'accepted' },
      {
        id: 'theirs',
        path: 'b.ts',
        line: 9,
        body: 'This retry never backs off',
        createdAt: 2,
        status: 'proposed',
        agentAuthor: { kind: 'agent', name: 'Claude Code' }
      }
    ])

    expect(screen.getByText(/Proposed by Claude Code/)).toBeInTheDocument()
    const acceptButtons = screen.getAllByRole('button', { name: 'Accept' })
    expect(acceptButtons).toHaveLength(1)

    fireEvent.click(acceptButtons[0]!)
    expect(accept).toHaveBeenCalledWith('theirs')

    fireEvent.click(screen.getByRole('button', { name: 'Reject proposal' }))
    expect(remove).toHaveBeenCalledWith('theirs')
  })
})
