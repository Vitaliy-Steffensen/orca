// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BranchEntryRow } from './branch-entry-row'
import { UncommittedEntryRow } from './uncommitted-entry-row'
import type { FileCommentCounts } from '@/components/diff-comments/file-comment-counts'
import type { GitStatusEntry } from '../../../../../../shared/git-status-types'

vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string) => fallback
}))
// Why stubbed: the row's context menu reads the open-in-app catalog and runtime owner from the
// store, none of which these assertions are about.
vi.mock('./entry-context-menu', () => ({
  SourceControlEntryContextMenu: ({ children }: { children: React.ReactNode }) => children
}))
vi.mock('@/lib/source-control-row-reveal', () => ({
  useSourceControlRowRevealFlash: () => false
}))

afterEach(cleanup)

const COUNTS: FileCommentCounts = {
  notes: 1,
  agentNotes: 2,
  unresolvedThreads: 3,
  pendingReview: 4
}

const PATH = 'src/a.ts'

function badgeKinds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-file-comment-badge]')).map(
    (node) => node.getAttribute('data-file-comment-badge') ?? ''
  )
}

describe('source control rows report what each file still carries', () => {
  it('shows every kind on an uncommitted row', () => {
    const entry: GitStatusEntry = { path: PATH, status: 'modified', area: 'unstaged' }
    const { container } = render(
      <TooltipProvider>
        <UncommittedEntryRow
          entryKey="k"
          entry={entry}
          currentWorktreeId="wt-1"
          worktreePath="/repo"
          onRevealInExplorer={vi.fn()}
          onOpen={vi.fn()}
          onStage={vi.fn()}
          onUnstage={vi.fn()}
          onDiscard={vi.fn()}
          commentCounts={COUNTS}
        />
      </TooltipProvider>
    )
    expect(badgeKinds(container)).toEqual([
      'notes',
      'agentNotes',
      'unresolvedThreads',
      'pendingReview'
    ])
  })

  it('shows every kind on a branch row, in the same order', () => {
    const { container } = render(
      <BranchEntryRow
        entry={{ path: PATH, status: 'modified' }}
        rowKey="k"
        currentWorktreeId="wt-1"
        worktreePath="/repo"
        onRevealInExplorer={vi.fn()}
        onOpen={vi.fn()}
        commentCounts={COUNTS}
      />
    )
    expect(badgeKinds(container)).toEqual([
      'notes',
      'agentNotes',
      'unresolvedThreads',
      'pendingReview'
    ])
  })

  it('stays quiet for a file with nothing outstanding', () => {
    const { container } = render(
      <BranchEntryRow
        entry={{ path: PATH, status: 'modified' }}
        rowKey="k"
        currentWorktreeId="wt-1"
        worktreePath="/repo"
        onRevealInExplorer={vi.fn()}
        onOpen={vi.fn()}
        commentCounts={undefined}
      />
    )
    expect(badgeKinds(container)).toEqual([])
  })
})
