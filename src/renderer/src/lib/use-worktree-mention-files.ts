import { useMemo } from 'react'
import { useRuntimeFileListForWorktree } from '@/components/quick-open-file-list'
import { rankQuickOpenFilesWithHistory } from '@/components/quick-open-history-ranking'
import { useQuickOpenHistory } from '@/lib/quick-open-file-history'
import { useKnownWorktreeById } from '@/store/selectors'

const MENTION_FILE_LIMIT = 20
const NO_FILES: readonly string[] = []

export type WorktreeMentionFiles = {
  /** Workspace-relative paths, best match first. */
  files: readonly string[]
  loading: boolean
  failed: boolean
}

/** The workspace files an `@` mention can name. `query` is null while no `@` token is open. */
export function useWorktreeMentionFiles(
  query: string | null,
  worktreeId: string | null
): WorktreeMentionFiles {
  const enabled = query !== null && worktreeId !== null
  const worktreePath = useKnownWorktreeById(enabled ? worktreeId : null)?.path ?? null
  const history = useQuickOpenHistory(enabled ? worktreeId : null, worktreePath)
  const list = useRuntimeFileListForWorktree({
    enabled,
    worktreeId: enabled ? worktreeId : null,
    query: query ?? '',
    recentPaths: history
  })
  const failed = list.loadError !== null

  return useMemo(
    () => ({
      files: enabled
        ? rankQuickOpenFilesWithHistory(query ?? '', list.files, history)
            .slice(0, MENTION_FILE_LIMIT)
            .map((item) => item.path)
        : NO_FILES,
      loading: list.loading,
      failed
    }),
    [enabled, failed, history, list.files, list.loading, query]
  )
}
