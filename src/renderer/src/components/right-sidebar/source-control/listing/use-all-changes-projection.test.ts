// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GitStatusEntry } from '../../../../../../shared/git-status-types'
import { useAllChangesProjection } from './use-all-changes-projection'

const unstaged: GitStatusEntry = { path: 'src/ui/b.ts', status: 'modified', area: 'unstaged' }
const untracked: GitStatusEntry = { path: 'README.md', status: 'untracked', area: 'untracked' }
const committed = { path: 'src/ui/a.ts', status: 'modified' as const }

function project(sourceControlViewMode: 'list' | 'tree', collapsedTreeDirs = new Set<string>()) {
  return renderHook(() =>
    useAllChangesProjection({
      sourceControlGrouping: 'all',
      visibleSelectionEntries: [],
      entries: [unstaged, untracked],
      branchEntries: [committed, { path: 'filtered-out.ts', status: 'added' }],
      filteredGrouped: { staged: [], unstaged: [unstaged], untracked: [untracked] },
      filteredBranchEntries: [committed],
      sourceControlViewMode,
      collapsedTreeDirs
    })
  ).result.current
}

describe('useAllChangesProjection', () => {
  it('lists the files the filter keeps, and counts every changed file for the heading', () => {
    const { allChangeEntries, totalAllChangeCount, allChangesReviewOrder } = project('list')
    expect(allChangeEntries.map((entry) => entry.path)).toEqual([
      'README.md',
      'src/ui/a.ts',
      'src/ui/b.ts'
    ])
    expect(totalAllChangeCount).toBe(4)
    expect(allChangesReviewOrder).toEqual([
      'branch-worktree::README.md',
      'branch-worktree::src/ui/a.ts',
      'branch-worktree::src/ui/b.ts'
    ])
  })

  it('groups the files by folder in tree view, honouring collapsed folders', () => {
    const open = project('tree')
    expect(open.visibleAllChangesTreeRows.map((node) => node.key)).toEqual([
      'dir::branch-worktree::src/ui',
      'branch-worktree::src/ui/a.ts',
      'branch-worktree::src/ui/b.ts',
      'branch-worktree::README.md'
    ])
    expect(open.allChangesReviewOrder).toEqual([
      'branch-worktree::src/ui/a.ts',
      'branch-worktree::src/ui/b.ts',
      'branch-worktree::README.md'
    ])

    const collapsed = project('tree', new Set(['dir::branch-worktree::src/ui']))
    expect(collapsed.allChangesReviewOrder).toEqual(['branch-worktree::README.md'])
  })
})
