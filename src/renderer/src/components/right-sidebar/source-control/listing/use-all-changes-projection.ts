import { useMemo } from 'react'
import type { GitBranchChangeEntry } from '../../../../../../shared/git-diff-compare-types'
import type { GitStatusEntry } from '../../../../../../shared/git-status-types'
import { useAppStore } from '@/store'
import type { SourceControlViewMode } from '../../../../../../shared/ui-chrome-types'
import {
  buildSourceControlTree,
  compactSourceControlTree,
  flattenSourceControlTree
} from '../../source-control-tree'
import { ALL_CHANGES_AREA, buildAllChangeEntries } from './all-changes'
import type { AllChangesTreeNode } from './all-changes-section'
import type { SourceControlEntryGroups } from './section-order'
import type { FlatEntry } from './use-selection'
import { isChangesSourceFilter, useChangesFilter } from '@/lib/changes-filter'
import { compareFileNames } from '../../../../../../shared/file-name-sort'

const NO_TREE_ROWS: AllChangesTreeNode[] = []

/** The all-changes rows, built from the same filtered status and branch entries the sections use. */
export function useAllChangesProjection({
  activeWorktreeId,
  visibleSelectionEntries,
  entries,
  branchEntries,
  filteredGrouped,
  filteredBranchEntries,
  sourceControlViewMode,
  collapsedTreeDirs
}: {
  activeWorktreeId: string | null
  visibleSelectionEntries: FlatEntry[]
  entries: readonly GitStatusEntry[]
  branchEntries: readonly GitBranchChangeEntry[]
  filteredGrouped: SourceControlEntryGroups
  filteredBranchEntries: readonly GitBranchChangeEntry[]
  sourceControlViewMode: SourceControlViewMode
  collapsedTreeDirs: ReadonlySet<string>
}) {
  // Why the merge-base check: a total can outlive the fork point it measured, like the branch chip's.
  const lineCounts = useAppStore((s) => {
    const total = activeWorktreeId ? s.gitBranchLineTotalByWorktree?.[activeWorktreeId] : undefined
    return total &&
      activeWorktreeId &&
      total.mergeBase === s.gitBranchCompareSummaryByWorktree[activeWorktreeId]?.mergeBase
      ? total.files
      : undefined
  })
  const changesFilter = useChangesFilter(activeWorktreeId)
  const uncommittedOnly = changesFilter?.kind === 'uncommitted'
  const unstagedOnly = changesFilter?.kind === 'unstaged'
  // Fork: a previewed turn or commit lists its own files in place of the branch's.
  const sourceEntries =
    changesFilter && isChangesSourceFilter(changesFilter) ? changesFilter.entries : null
  const allChangeEntries = useMemo(() => {
    if (sourceEntries) {
      return [...sourceEntries].sort((a, b) => compareFileNames(a.path, b.path))
    }
    return buildAllChangeEntries(
      [...filteredGrouped.staged, ...filteredGrouped.unstaged, ...filteredGrouped.untracked],
      filteredBranchEntries,
      { uncommittedOnly, unstagedOnly, ...(lineCounts ? { lineCounts } : {}) }
    )
  }, [
    filteredBranchEntries,
    filteredGrouped,
    lineCounts,
    sourceEntries,
    uncommittedOnly,
    unstagedOnly
  ])
  const totalAllChangeCount = useMemo(() => {
    return sourceEntries
      ? sourceEntries.length
      : buildAllChangeEntries(entries, branchEntries).length
  }, [branchEntries, entries, sourceEntries])
  const visibleAllChangesTreeRows = useMemo(
    () =>
      sourceControlViewMode === 'tree'
        ? flattenSourceControlTree(
            compactSourceControlTree(buildSourceControlTree(ALL_CHANGES_AREA, allChangeEntries)),
            collapsedTreeDirs
          )
        : NO_TREE_ROWS,
    [allChangeEntries, collapsedTreeDirs, sourceControlViewMode]
  )
  const allChangesReviewOrder = useMemo(
    () =>
      sourceControlViewMode === 'tree'
        ? visibleAllChangesTreeRows.flatMap((node) => (node.type === 'file' ? [node.key] : []))
        : allChangeEntries.map((entry) => `${ALL_CHANGES_AREA}::${entry.path}`),
    [allChangeEntries, sourceControlViewMode, visibleAllChangesTreeRows]
  )
  return {
    // Staged and unstaged rows stay selectable while Changes is on screen. Their keys
    // (staged::path) do not collide with the review rows (branch-worktree::path).
    selectableEntries: visibleSelectionEntries,
    changesFilter,
    allChangeEntries,
    totalAllChangeCount,
    visibleAllChangesTreeRows,
    allChangesReviewOrder
  }
}
