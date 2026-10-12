import { useAppStore } from '@/store'
import { detectLanguage } from '@/lib/language-detect'
import { compareFileNames } from '../../../shared/file-name-sort'
import type {
  GitBranchChangeEntry,
  GitCommitCompareSummary
} from '../../../shared/git-diff-compare-types'
import { openChangesFilterEntry } from '@/store/slices/editor/actions/open-changes-filter-entry'
import { setChangesFilter } from './changes-filter'

export type ShowInChangesSource =
  | { kind: 'commit'; subject?: string; message?: string }
  | { kind: 'turn'; prompt: string; latest: boolean }

export type ShowInChanges = (
  worktreeId: string,
  worktreePath: string,
  summary: GitCommitCompareSummary,
  entries: GitBranchChangeEntry[],
  source: ShowInChangesSource
) => void

// Fork: a commit or agent turn is previewed as a filter on the Changes list, each file opening in
// the normal diff viewer, instead of a separate all-files view.
export const showInChanges: ShowInChanges = (
  worktreeId,
  worktreePath,
  summary,
  entries,
  source
) => {
  const compare = {
    commitOid: summary.commitOid,
    parentOid: summary.parentOid,
    compareRef: summary.compareRef,
    baseRef: summary.baseRef
  }
  setChangesFilter(
    worktreeId,
    source.kind === 'commit'
      ? { kind: 'commit', compare, entries, subject: source.subject, message: source.message }
      : { kind: 'turn', compare, entries, prompt: source.prompt, latest: source.latest }
  )
  const store = useAppStore.getState()
  store.setRightSidebarOpen(true)
  store.setRightSidebarTab('source-control')
  const [first] = [...entries].sort((a, b) => compareFileNames(a.path, b.path))
  if (first) {
    const language = detectLanguage(first.path)
    openChangesFilterEntry(store, worktreeId, worktreePath, first.path, language, { preview: true })
  }
}
