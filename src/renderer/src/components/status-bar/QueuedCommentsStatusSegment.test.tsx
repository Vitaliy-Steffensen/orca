// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { QueuedCommentsStatusSegment } from './QueuedCommentsStatusSegment'

const queued = vi.hoisted(() => ({ count: 0, send: vi.fn() }))

vi.mock('@/store', () => ({
  useAppStore: (select: (state: { activeWorktreeId: string }) => unknown) =>
    select({ activeWorktreeId: 'wt' })
}))
vi.mock('@/hooks/useShortcutLabel', () => ({ useOptionalShortcutLabel: () => '⌥⌘S' }))
vi.mock('@/components/right-sidebar/queued-pr-comments-send', () => ({
  useQueuedPRCommentCount: () => queued.count,
  sendQueuedPRCommentsForActiveWorktree: queued.send
}))

function renderSegment() {
  return render(
    <TooltipProvider>
      <QueuedCommentsStatusSegment iconOnly={false} />
    </TooltipProvider>
  )
}

afterEach(cleanup)

describe('QueuedCommentsStatusSegment', () => {
  it('stays out of the status bar while nothing is queued', () => {
    queued.count = 0
    const { container } = renderSegment()
    expect(container.textContent).toBe('')
  })

  it('sends the queued comments from wherever the user is', () => {
    queued.count = 3
    renderSegment()
    fireEvent.click(screen.getByRole('button', { name: 'Send 3 queued comments' }))
    expect(queued.send).toHaveBeenCalled()
    expect(screen.getByText('3 queued')).toBeTruthy()
  })
})
