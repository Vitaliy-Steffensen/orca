import { useCallback, useEffect } from 'react'
import { useAppStore } from '@/store'
import {
  getExecutionHostIdForWorktree,
  getRuntimeEnvironmentIdForWorktree
} from '@/lib/worktree-runtime-owner'
import {
  isFileSearchResultOwnerCurrent,
  type FileSearchResultOwner
} from '@/lib/file-search-result-owner'
import type { FileSearchScopeId } from '@/store/slices/editor/types/file-search-scope-id'

export function useFileSearchScope({
  activeWorktreeId,
  worktreePath,
  scope,
  active,
  executeSearch,
  cancelPendingSearch,
  updateActiveSearchState
}: {
  activeWorktreeId: string | null
  worktreePath: string | null
  scope: FileSearchScopeId
  active: boolean
  executeSearch: (query: string) => void
  cancelPendingSearch: () => void
  updateActiveSearchState: (updates: { results: null; resultOwner: null; error: null }) => void
}) {
  const runtimeEnvironmentId = useAppStore((state) =>
    getRuntimeEnvironmentIdForWorktree(state, activeWorktreeId)
  )
  const executionHostId = useAppStore((state) =>
    getExecutionHostIdForWorktree(state, activeWorktreeId)
  )
  const isCurrentOwner = useCallback(
    (owner: FileSearchResultOwner | null | undefined) =>
      isFileSearchResultOwnerCurrent(
        owner,
        activeWorktreeId,
        worktreePath,
        runtimeEnvironmentId,
        executionHostId
      ),
    [activeWorktreeId, worktreePath, runtimeEnvironmentId, executionHostId]
  )
  useEffect(() => {
    if (activeWorktreeId) {
      const saved = useAppStore.getState().fileSearchStateByWorktree[activeWorktreeId]?.[scope]
      if ((saved?.results || saved?.error) && !isCurrentOwner(saved.resultOwner)) {
        cancelPendingSearch()
        updateActiveSearchState({ results: null, resultOwner: null, error: null })
      }
    }
    if (!active) {
      cancelPendingSearch()
    } else if (activeWorktreeId) {
      const saved = useAppStore.getState().fileSearchStateByWorktree[activeWorktreeId]?.[scope]
      if (
        saved?.query.trim() &&
        !saved.results &&
        !saved.error &&
        saved.seedRequestId === undefined
      ) {
        executeSearch(saved.query)
      }
    }
  }, [
    active,
    scope,
    activeWorktreeId,
    isCurrentOwner,
    updateActiveSearchState,
    cancelPendingSearch,
    executeSearch
  ])
  return isCurrentOwner
}
