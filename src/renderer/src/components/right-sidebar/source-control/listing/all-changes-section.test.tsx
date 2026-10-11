// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GitBranchChangeEntry } from '../../../../../../shared/git-diff-compare-types'
import { SourceControlAllChangesSection } from './all-changes-section'

const entries: GitBranchChangeEntry[] = [
  { path: 'src/committed.ts', status: 'modified', added: 3, removed: 1 },
  { path: 'src/untracked.ts', status: 'added', added: 4 }
]

function renderSection(overrides: Partial<Parameters<typeof SourceControlAllChangesSection>[0]>) {
  const props: Parameters<typeof SourceControlAllChangesSection>[0] = {
    baseRef: 'refs/remotes/origin/main',
    entries,
    totalEntryCount: entries.length,
    collapsed: false,
    onToggle: vi.fn(),
    sourceControlViewMode: 'list',
    visibleTreeRows: [],
    fileListScrollElement: null,
    collapsedTreeDirs: new Set(),
    toggleTreeDir: vi.fn(),
    currentWorktreeId: 'wt',
    worktreePath: '/repo',
    revealInExplorer: vi.fn(),
    activeConnectionId: null,
    onOpen: vi.fn(),
    onViewAll: vi.fn(),
    diffCommentCountByPath: new Map(),
    reviewThreadCountByPath: new Map(),
    pendingReviewCountByPath: new Map(),
    activeOpenRowKeys: new Set(),
    activeOpenRowKey: null,
    ...overrides
  }
  render(<SourceControlAllChangesSection {...props} />)
  return props
}

afterEach(cleanup)

describe('SourceControlAllChangesSection', () => {
  it('lists every changed file under one heading counted against the base', () => {
    renderSection({})
    expect(screen.getByText('Changes')).toBeTruthy()
    expect(screen.getByTitle('2 files changed vs origin/main')).toBeTruthy()
    expect(screen.getByText('committed.ts')).toBeTruthy()
    expect(screen.getByText('untracked.ts')).toBeTruthy()
  })

  it('opens the clicked file and marks the open one', () => {
    const props = renderSection({
      activeOpenRowKeys: new Set(['branch-worktree::src/untracked.ts'])
    })
    fireEvent.click(screen.getByText('committed.ts'))
    expect(props.onOpen).toHaveBeenCalledWith(entries[0], expect.anything())
    expect(screen.getByText('untracked.ts').closest('[data-current="true"]')).toBeTruthy()
    expect(screen.getByText('committed.ts').closest('[data-current="true"]')).toBeNull()
  })

  it('keeps extra header actions, like the file type filter, beside View all', () => {
    renderSection({ headerActions: <button type="button">Filter</button> })
    expect(screen.getByText('Filter')).toBeTruthy()
  })

  it('opens every file together from View all', () => {
    const props = renderSection({})
    fireEvent.click(screen.getByText('View all'))
    expect(props.onViewAll).toHaveBeenCalled()
  })
})
