import { useCallback } from 'react'
import { useAppStore } from '@/store'
import type { FileSearchScopeId } from '@/store/slices/editor/types/file-search-scope-id'
import type { FileSearchWorktreeState } from '@/store/slices/editor/types/file-search-worktree-state'

export type FileSearchScopeStateModel = {
  searchState: FileSearchWorktreeState | null
  updateActiveSearchState: (updates: Partial<FileSearchWorktreeState>) => void
  clearActiveSearch: () => void
  toggleActiveCollapsedFile: (filePath: string) => void
  consumeSeedRequest: (seedRequestId: number) => void
}

/** The store read/write layer for one panel's content search, isolated per scope. */
export function useFileSearchScopeState(
  activeWorktreeId: string | null,
  scope: FileSearchScopeId
): FileSearchScopeStateModel {
  const searchState = useAppStore((s) =>
    activeWorktreeId ? (s.fileSearchStateByWorktree[activeWorktreeId]?.[scope] ?? null) : null
  )
  const updateFileSearchState = useAppStore((s) => s.updateFileSearchState)
  const consumeFileSearchSeedRequest = useAppStore((s) => s.consumeFileSearchSeedRequest)
  const toggleFileSearchCollapsedFile = useAppStore((s) => s.toggleFileSearchCollapsedFile)
  const clearFileSearch = useAppStore((s) => s.clearFileSearch)

  const updateActiveSearchState = useCallback(
    (updates: Partial<FileSearchWorktreeState>) => {
      if (!activeWorktreeId) {
        return
      }
      updateFileSearchState(activeWorktreeId, scope, updates)
    },
    [activeWorktreeId, scope, updateFileSearchState]
  )

  const clearActiveSearch = useCallback(() => {
    if (!activeWorktreeId) {
      return
    }
    clearFileSearch(activeWorktreeId, scope)
  }, [activeWorktreeId, scope, clearFileSearch])

  const toggleActiveCollapsedFile = useCallback(
    (filePath: string) => {
      if (!activeWorktreeId) {
        return
      }
      toggleFileSearchCollapsedFile(activeWorktreeId, scope, filePath)
    },
    [activeWorktreeId, scope, toggleFileSearchCollapsedFile]
  )

  const consumeSeedRequest = useCallback(
    (seedRequestId: number) => {
      if (!activeWorktreeId) {
        return
      }
      consumeFileSearchSeedRequest(activeWorktreeId, scope, seedRequestId)
    },
    [activeWorktreeId, scope, consumeFileSearchSeedRequest]
  )

  return {
    searchState,
    updateActiveSearchState,
    clearActiveSearch,
    toggleActiveCollapsedFile,
    consumeSeedRequest
  }
}
