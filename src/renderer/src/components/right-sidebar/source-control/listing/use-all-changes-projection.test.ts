// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GitStatusEntry } from '../../../../../../shared/git-status-types'
import { useAllChangesProjection } from './use-all-changes-projection'
import type { FlatEntry } from './use-selection'
import {
  clearChangesFilter,
  setChangesFilter,
  toggleUncommittedOnly,
  toggleUnstagedOnly
} from '@/lib/changes-filter'

const unstaged: GitStatusEntry = { path: 'src/ui/b.ts', status: 'modified', area: 'unstaged' }
const untracked: GitStatusEntry = { path: 'README.md', status: 'untracked', area: 'untracked' }
const committed = { path: 'src/ui/a.ts', status: 'modified' as const }

function renderProjection(
  sourceControlViewMode: 'list' | 'tree',
  collapsedTreeDirs = new Set<string>(),
  activeWorktreeId = 'wt',
  visibleSelectionEntries: FlatEntry[] = []
) {
  return renderHook(() =>
    useAllChangesProjection({
      activeWorktreeId,
      visibleSelectionEntries,
      entries: [unstaged, untracked],
      branchEntries: [committed, { path: 'filtered-out.ts', status: 'added' }],
      filteredGrouped: { staged: [], unstaged: [unstaged], untracked: [untracked] },
      filteredBranchEntries: [committed],
      sourceControlViewMode,
      collapsedTreeDirs
    })
  )
}

function project(sourceControlViewMode: 'list' | 'tree', collapsedTreeDirs = new Set<string>()) {
  return renderProjection(sourceControlViewMode, collapsedTreeDirs).result.current
}

describe('useAllChangesProjection', () => {
  it('keeps staged and unstaged rows selectable while the changes list is showing', () => {
    const selectable: FlatEntry[] = [
      { key: 'staged::src/ui/b.ts', entry: unstaged, area: 'staged' }
    ]
    const { result } = renderProjection('list', new Set(), 'wt-selectable', selectable)
    expect(result.current.selectableEntries).toBe(selectable)
    expect(result.current.allChangeEntries.map((entry) => entry.path)).toEqual([
      'README.md',
      'src/ui/a.ts',
      'src/ui/b.ts'
    ])
  })

  it("lists a previewed turn's or commit's files instead of the branch's, counted on their own", () => {
    const { result } = renderProjection('list', new Set(), 'wt-turn')
    act(() =>
      setChangesFilter('wt-turn', {
        kind: 'turn',
        compare: {
          commitOid: 'e'.repeat(40),
          parentOid: 's'.repeat(40),
          compareRef: 'e',
          baseRef: 's'
        },
        entries: [
          { path: 'z.ts', status: 'added' },
          { path: 'src/ui/b.ts', status: 'modified' }
        ],
        prompt: 'Do the thing',
        latest: true
      })
    )
    expect(result.current.allChangeEntries.map((entry) => entry.path)).toEqual([
      'src/ui/b.ts',
      'z.ts'
    ])
    expect(result.current.totalAllChangeCount).toBe(2)
    act(() => clearChangesFilter('wt-turn'))
  })

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

  it('narrows to unstaged files when the workspace toggles that filter on', () => {
    const staged: GitStatusEntry = { path: 'src/ui/c.ts', status: 'modified', area: 'staged' }
    const { result } = renderHook(() =>
      useAllChangesProjection({
        activeWorktreeId: 'wt-unstaged',
        visibleSelectionEntries: [],
        entries: [unstaged, untracked, staged],
        branchEntries: [committed],
        filteredGrouped: { staged: [staged], unstaged: [unstaged], untracked: [untracked] },
        filteredBranchEntries: [committed],
        sourceControlViewMode: 'list',
        collapsedTreeDirs: new Set()
      })
    )
    act(() => toggleUnstagedOnly('wt-unstaged'))
    expect(result.current.changesFilter).toEqual({ kind: 'unstaged' })
    expect(result.current.allChangeEntries.map((entry) => entry.path)).toEqual(['src/ui/b.ts'])
    expect(result.current.totalAllChangeCount).toBe(4)
    act(() => clearChangesFilter('wt-unstaged'))
  })

  it('narrows to uncommitted files when the workspace toggles that filter on', () => {
    const { result } = renderProjection('list', new Set(), 'wt-uncommitted')
    act(() => toggleUncommittedOnly('wt-uncommitted'))
    expect(result.current.changesFilter).toEqual({ kind: 'uncommitted' })
    expect(result.current.allChangeEntries.map((entry) => entry.path)).toEqual([
      'README.md',
      'src/ui/b.ts'
    ])
    expect(result.current.totalAllChangeCount).toBe(4)
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
