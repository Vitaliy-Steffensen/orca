import type { GitBranchChangeEntry } from '../../../../../shared/git-diff-compare-types'
import type { GitStatusEntry } from '../../../../../shared/git-status-types'
import { useFileSearchPanel, type FileSearchPanelModel } from '../useFileSearchPanel'
import { useChangedFileSearchPaths } from '../source-control/listing/changed-file-search-paths'
import type { FileFindMode } from '../file-find/file-find-mode'

/** The PR tab's Contents mode: the Explorer's search, confined to the base-vs-now file set. */
export function usePrDiffContentSearch({
  activeWorktreeId,
  entries,
  branchEntries,
  findMode,
  findExpanded
}: {
  activeWorktreeId: string | null
  entries: readonly GitStatusEntry[]
  branchEntries: readonly GitBranchChangeEntry[]
  findMode: FileFindMode
  /** Collapsing the bar hides the results, so pending work must stop with it. */
  findExpanded: boolean
}): FileSearchPanelModel {
  const restriction = useChangedFileSearchPaths(activeWorktreeId, entries, branchEntries)
  return useFileSearchPanel({
    scope: 'pr-diff',
    active: findMode === 'contents' && findExpanded,
    restriction
  })
}
