import { getChangesFilter } from '@/lib/changes-filter'
import type { EditorSlice } from '../types/editor-slice'
import type { EditorOpenTargetOptions } from '../types/open-file'

const TURN_START_LABEL = 'turn start'
const WORKING_TREE_LABEL = 'working tree'

/**
 * Fork: opens a Changes row while a turn or commit is previewed. The latest turn shows live, from
 * just before it to disk; an older turn and a commit show what they changed. Returns false when no
 * turn or commit is previewed, so the caller opens the row its usual way.
 */
export function openChangesFilterEntry(
  state: Pick<EditorSlice, 'openCommitDiff' | 'openBranchWorktreeDiff'>,
  worktreeId: string,
  worktreePath: string,
  relativePath: string,
  language: string,
  options?: EditorOpenTargetOptions
): boolean {
  const filter = getChangesFilter(worktreeId)
  if (!filter || filter.kind === 'uncommitted') {
    return false
  }
  const entry = filter.entries.find((candidate) => candidate.path === relativePath) ?? {
    path: relativePath,
    status: 'modified' as const
  }
  const start = filter.compare.parentOid
  if (filter.kind === 'turn' && filter.latest && start) {
    state.openBranchWorktreeDiff(
      worktreeId,
      worktreePath,
      entry,
      {
        baseRef: TURN_START_LABEL,
        baseOid: start,
        compareRef: WORKING_TREE_LABEL,
        headOid: filter.compare.commitOid,
        // Why mergeBase: it is what the left side reads, so the turn's start snapshot is the base.
        mergeBase: start
      },
      language,
      { ...options, pinBranchBase: true }
    )
    return true
  }
  state.openCommitDiff(
    worktreeId,
    worktreePath,
    entry,
    {
      ...filter.compare,
      ...(filter.kind === 'commit'
        ? { subject: filter.subject, message: filter.message }
        : { message: filter.prompt })
    },
    language,
    options
  )
  return true
}
