import type { GitBranchChangeEntry } from '../../../../../shared/git-diff-compare-types'
import type { GitStatusEntry } from '../../../../../shared/git-status-types'
import {
  filterSourceControlGroupedPathEntries,
  filterSourceControlPathEntries,
  getSourceControlFileFilterState,
  type SourceControlFileFilterState
} from '../source-control/listing/file-filter'
import type { SourceControlEntryGroups } from '../source-control/listing/section-order'

export type ChangedPathGroups = {
  filter: SourceControlFileFilterState
  filteredGrouped: SourceControlEntryGroups
  filteredBranchEntries: GitBranchChangeEntry[]
}

/**
 * The two filtered inputs the all-changes projection needs, without the section trees, submodule
 * rows and selection entries the Source Control panel's projection also builds.
 */
export function buildChangedPathGroups(
  statusEntries: readonly GitStatusEntry[],
  branchEntries: readonly GitBranchChangeEntry[],
  query: string
): ChangedPathGroups {
  const filter = getSourceControlFileFilterState(query)
  const grouped: SourceControlEntryGroups = { staged: [], unstaged: [], untracked: [] }
  for (const entry of statusEntries) {
    if (entry.area === 'staged') {
      grouped.staged.push(entry)
    } else if (entry.area === 'untracked') {
      grouped.untracked.push(entry)
    } else {
      grouped.unstaged.push(entry)
    }
  }
  return {
    filter,
    filteredGrouped: filterSourceControlGroupedPathEntries(grouped, filter),
    filteredBranchEntries: filterSourceControlPathEntries([...branchEntries], filter)
  }
}
