import { useMemo } from 'react'
import type { GitBranchChangeEntry } from '../../../../../../shared/git-diff-compare-types'
import type { GitStatusEntry } from '../../../../../../shared/git-status-types'
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

const NO_ENTRIES: GitBranchChangeEntry[] = []
const NO_TREE_ROWS: AllChangesTreeNode[] = []
const NO_SELECTABLE_ENTRIES: FlatEntry[] = []

/** The all-changes rows, built from the same filtered status and branch entries the sections use. */
export function useAllChangesProjection({
  sourceControlGrouping,
  visibleSelectionEntries,
  entries,
  branchEntries,
  filteredGrouped,
  filteredBranchEntries,
  sourceControlViewMode,
  collapsedTreeDirs
}: {
  sourceControlGrouping: 'all' | 'status'
  visibleSelectionEntries: FlatEntry[]
  entries: readonly GitStatusEntry[]
  branchEntries: readonly GitBranchChangeEntry[]
  filteredGrouped: SourceControlEntryGroups
  filteredBranchEntries: readonly GitBranchChangeEntry[]
  sourceControlViewMode: SourceControlViewMode
  collapsedTreeDirs: ReadonlySet<string>
}) {
  const enabled = sourceControlGrouping === 'all'
  const allChangeEntries = useMemo(
    () =>
      enabled
        ? buildAllChangeEntries(
            [...filteredGrouped.staged, ...filteredGrouped.unstaged, ...filteredGrouped.untracked],
            filteredBranchEntries
          )
        : NO_ENTRIES,
    [enabled, filteredBranchEntries, filteredGrouped]
  )
  const totalAllChangeCount = useMemo(
    () => (enabled ? buildAllChangeEntries(entries, branchEntries).length : 0),
    [branchEntries, enabled, entries]
  )
  const visibleAllChangesTreeRows = useMemo(
    () =>
      enabled && sourceControlViewMode === 'tree'
        ? flattenSourceControlTree(
            compactSourceControlTree(buildSourceControlTree(ALL_CHANGES_AREA, allChangeEntries)),
            collapsedTreeDirs
          )
        : NO_TREE_ROWS,
    [allChangeEntries, collapsedTreeDirs, enabled, sourceControlViewMode]
  )
  const allChangesReviewOrder = useMemo(
    () =>
      sourceControlViewMode === 'tree'
        ? visibleAllChangesTreeRows.flatMap((node) => (node.type === 'file' ? [node.key] : []))
        : allChangeEntries.map((entry) => `${ALL_CHANGES_AREA}::${entry.path}`),
    [allChangeEntries, sourceControlViewMode, visibleAllChangesTreeRows]
  )
  return {
    showAllChanges: enabled,
    // Why: the all-changes rows have no staging, so nothing is selectable while they show.
    selectableEntries: enabled ? NO_SELECTABLE_ENTRIES : visibleSelectionEntries,
    allChangeEntries,
    totalAllChangeCount,
    visibleAllChangesTreeRows,
    allChangesReviewOrder
  }
}
