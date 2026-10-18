// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BranchEntryRow } from './branch-entry-row'
import type { GitBranchChangeEntry } from '../../../../../../shared/git-diff-compare-types'

vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string) => fallback
}))
vi.mock('@/lib/source-control-row-reveal', () => ({
  useSourceControlRowRevealFlash: () => false
}))
vi.mock('./entry-context-menu', () => ({
  SourceControlEntryContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

afterEach(cleanup)

const entry: GitBranchChangeEntry = { path: 'src/a.ts', status: 'modified' }

function renderRow(review?: Parameters<typeof BranchEntryRow>[0]['review']) {
  const onOpen = vi.fn()
  render(
    <BranchEntryRow
      entry={entry}
      rowKey="branch-worktree::src/a.ts"
      currentWorktreeId="w1"
      worktreePath="/repo"
      onRevealInExplorer={vi.fn()}
      onOpen={onOpen}
      commentCounts={undefined}
      review={review}
    />
  )
  return { onOpen }
}

describe('BranchEntryRow review progress', () => {
  it('shows no checkbox where review progress is not tracked', () => {
    renderRow()
    expect(screen.queryByTestId('branch-entry-viewed-checkbox')).not.toBeInTheDocument()
    expect(screen.queryByTestId('branch-entry-changed-since-viewed')).not.toBeInTheDocument()
  })

  it('ticks the file off without opening it', () => {
    const onToggleViewed = vi.fn()
    const { onOpen } = renderRow({
      isViewed: false,
      changedSinceViewed: false,
      onToggleViewed
    })
    fireEvent.click(screen.getByTestId('branch-entry-viewed-checkbox'))
    expect(onToggleViewed).toHaveBeenCalledTimes(1)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('reads as ticked and dims the name once viewed', () => {
    renderRow({ isViewed: true, changedSinceViewed: false, onToggleViewed: vi.fn() })
    expect(screen.getByTestId('branch-entry-viewed-checkbox')).toHaveAttribute(
      'data-state',
      'checked'
    )
    expect(screen.getByText('a.ts')).toHaveClass('text-muted-foreground')
  })

  it('marks a file that changed since it was ticked', () => {
    renderRow({ isViewed: false, changedSinceViewed: true, onToggleViewed: vi.fn() })
    expect(screen.getByTestId('branch-entry-changed-since-viewed')).toBeInTheDocument()
    expect(screen.getByTestId('branch-entry-viewed-checkbox')).toHaveAttribute(
      'data-state',
      'unchecked'
    )
  })

  it('still opens the file when the row itself is clicked', () => {
    const { onOpen } = renderRow({
      isViewed: false,
      changedSinceViewed: false,
      onToggleViewed: vi.fn()
    })
    fireEvent.click(screen.getByText('a.ts'))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
