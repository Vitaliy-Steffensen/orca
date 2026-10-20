import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Repo } from '../../../../shared/repo-types'
import type { Worktree } from '../../../../shared/worktree/types'
import HostedReviewActions from './HostedReviewActions'

vi.mock('@/store', () => ({ useAppStore: () => false }))
vi.mock('./use-hosted-review-actions', () => ({
  useHostedReviewActions: () => ({
    merging: false,
    readying: false,
    stateUpdating: null,
    actionError: null,
    handleMerge: vi.fn(),
    handleAutoMerge: vi.fn(),
    handleMarkReadyForReview: vi.fn(),
    handleCloseReview: vi.fn(),
    handleReopenReview: vi.fn()
  })
}))
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />
}))

// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the merged-state actions read only the repo id and path.
const repo = { id: 'repo-1', path: '/repo' } as Repo

function renderMerged(isArchived: boolean): string {
  return renderToStaticMarkup(
    <HostedReviewActions
      review={{
        provider: 'github',
        number: 42,
        state: 'merged',
        status: 'success',
        mergeable: 'UNKNOWN'
      }}
      repo={repo}
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the merged-state actions read only the worktree id and isArchived.
      worktree={{ id: 'worktree-1', isArchived } as Worktree}
      onRefreshReview={vi.fn().mockResolvedValue(undefined)}
    />
  )
}

describe('HostedReviewActions merged state', () => {
  it('offers Archive Workspace alongside Delete when the workspace is still active', () => {
    const html = renderMerged(false)
    expect(html).toContain('Archive Workspace')
    expect(html).toContain('Delete Workspace')
  })

  it('drops Archive once the workspace is archived', () => {
    const html = renderMerged(true)
    expect(html).not.toContain('Archive Workspace')
    expect(html).toContain('Delete Workspace')
  })
})
