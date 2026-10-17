import { useMemo } from 'react'
import type { GitBranchChangeEntry } from '../../../../../../shared/git-diff-compare-types'
import type { GitStatusEntry } from '../../../../../../shared/git-status-types'
import { useChangesFilter } from '@/lib/changes-filter'
import { compareFileNames } from '../../../../../../shared/file-name-sort'
import { buildAllChangeEntries } from './all-changes'
import {
  createFileSearchPathRestriction,
  type FileSearchPathRestriction
} from '../../file-search-path-restriction'

/**
 * The paths a changed-files panel's content search may look inside: the same union the
 * rows come from, minus what ripgrep cannot usefully open.
 */
export function buildChangedFileSearchPaths(
  statusEntries: readonly GitStatusEntry[],
  branchEntries: readonly GitBranchChangeEntry[],
  options: {
    uncommittedOnly?: boolean
    sourceEntries?: readonly GitBranchChangeEntry[] | null
  } = {}
): string[] {
  const entries = options.sourceEntries
    ? [...options.sourceEntries].sort((a, b) => compareFileNames(a.path, b.path))
    : buildAllChangeEntries(statusEntries, branchEntries, {
        uncommittedOnly: options.uncommittedOnly ?? false
      })
  // Why: a submodule row is a nested repository, not a file rg should descend into.
  const submoduleRoots = new Set(
    statusEntries.flatMap((entry) => (entry.submodule ? [entry.path] : []))
  )
  // The pre-image of a rename is gone, so only `path` is ever on disk.
  return entries.flatMap((entry) =>
    entry.status === 'deleted' || submoduleRoots.has(entry.path) ? [] : [entry.path]
  )
}

/** Keyed on the joined signature: git status polls constantly and rebuilds these arrays. */
export function useChangedFileSearchPaths(
  activeWorktreeId: string | null,
  statusEntries: readonly GitStatusEntry[],
  branchEntries: readonly GitBranchChangeEntry[]
): FileSearchPathRestriction {
  const changesFilter = useChangesFilter(activeWorktreeId)
  const uncommittedOnly = changesFilter?.kind === 'uncommitted'
  const sourceEntries =
    changesFilter && changesFilter.kind !== 'uncommitted' ? changesFilter.entries : null
  const signature = useMemo(
    () =>
      buildChangedFileSearchPaths(statusEntries, branchEntries, {
        uncommittedOnly,
        sourceEntries
      }).join('\n'),
    [statusEntries, branchEntries, uncommittedOnly, sourceEntries]
  )
  return useMemo(
    () => createFileSearchPathRestriction(signature ? signature.split('\n') : []),
    [signature]
  )
}
