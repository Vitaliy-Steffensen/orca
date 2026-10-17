import type { EditorGet, EditorSet } from '../types/editor-set-get'
import type { EditorSlice } from '../types/editor-slice'
import type { FileSearchWorktreeState } from '../types/file-search-worktree-state'
import {
  readFileSearchScopeState,
  withFileSearchScopeState
} from '../search/file-search-scope-update'

function seeded(
  current: FileSearchWorktreeState,
  updates: Partial<FileSearchWorktreeState>
): FileSearchWorktreeState {
  return {
    ...current,
    ...updates,
    results: null,
    resultOwner: null,
    loading: false,
    error: null,
    collapsedFiles: new Set(),
    seedRequestId: (current.seedRequestId ?? 0) + 1
  }
}

export function createFileSearchActions(
  set: EditorSet,
  _get: EditorGet
): Pick<
  EditorSlice,
  | 'fileSearchStateByWorktree'
  | 'updateFileSearchState'
  | 'seedFileSearchQuery'
  | 'seedFileSearchIncludePattern'
  | 'consumeFileSearchSeedRequest'
  | 'toggleFileSearchCollapsedFile'
  | 'clearFileSearch'
> {
  return {
    fileSearchStateByWorktree: {},
    updateFileSearchState: (worktreeId, scope, updates) =>
      set((s) => ({
        fileSearchStateByWorktree: withFileSearchScopeState(
          s.fileSearchStateByWorktree,
          worktreeId,
          scope,
          (current) => ({ ...current, ...updates })
        )
      })),
    // Why: the seeding entry points (command palette, find chord) are Explorer-targeted.
    seedFileSearchQuery: (worktreeId, query) =>
      set((s) => ({
        fileSearchStateByWorktree: withFileSearchScopeState(
          s.fileSearchStateByWorktree,
          worktreeId,
          'explorer',
          (current) => seeded(current, { query })
        )
      })),
    seedFileSearchIncludePattern: (worktreeId, includePattern) =>
      set((s) => ({
        fileSearchStateByWorktree: withFileSearchScopeState(
          s.fileSearchStateByWorktree,
          worktreeId,
          'explorer',
          (current) => seeded(current, { includePattern })
        )
      })),
    consumeFileSearchSeedRequest: (worktreeId, scope, seedRequestId) =>
      set((s) => {
        const current = readFileSearchScopeState(s.fileSearchStateByWorktree, worktreeId, scope)
        if (!current || current.seedRequestId !== seedRequestId) {
          return s
        }
        return {
          fileSearchStateByWorktree: withFileSearchScopeState(
            s.fileSearchStateByWorktree,
            worktreeId,
            scope,
            (state) => {
              const next = { ...state }
              delete next.seedRequestId
              return next
            }
          )
        }
      }),
    toggleFileSearchCollapsedFile: (worktreeId, scope, filePath) =>
      set((s) => {
        if (!readFileSearchScopeState(s.fileSearchStateByWorktree, worktreeId, scope)) {
          return s
        }
        return {
          fileSearchStateByWorktree: withFileSearchScopeState(
            s.fileSearchStateByWorktree,
            worktreeId,
            scope,
            (current) => {
              const nextCollapsed = new Set(current.collapsedFiles)
              if (nextCollapsed.has(filePath)) {
                nextCollapsed.delete(filePath)
              } else {
                nextCollapsed.add(filePath)
              }
              return { ...current, collapsedFiles: nextCollapsed }
            }
          )
        }
      }),
    clearFileSearch: (worktreeId, scope) =>
      set((s) => {
        if (!readFileSearchScopeState(s.fileSearchStateByWorktree, worktreeId, scope)) {
          return s
        }
        return {
          fileSearchStateByWorktree: withFileSearchScopeState(
            s.fileSearchStateByWorktree,
            worktreeId,
            scope,
            (current) => ({
              ...current,
              query: '',
              results: null,
              resultOwner: null,
              loading: false,
              error: null,
              collapsedFiles: new Set()
            })
          )
        }
      })
  }
}
