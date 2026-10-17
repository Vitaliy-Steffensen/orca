import type { GitBranchChangeEntry } from '../../../../../../shared/git-diff-compare-types'
import type { GitStatusEntry } from '../../../../../../shared/git-status-types'
import { useFileSearchPanel, type FileSearchPanelModel } from '../../useFileSearchPanel'
import { useChangedFileSearchPaths } from '../listing/changed-file-search-paths'
import type { FileFindMode } from '../../file-find/file-find-mode'

/** Source Control's Contents mode: the Explorer's search, confined to the changed files it lists. */
export function useSourceControlContentSearch({
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
    scope: 'source-control',
    active: findMode === 'contents' && findExpanded,
    restriction
  })
}
