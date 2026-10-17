import { FILE_SEARCH_SCOPE_IDS, type FileSearchScopeId } from '../types/file-search-scope-id'
import type {
  FileSearchScopedStates,
  FileSearchWorktreeState
} from '../types/file-search-worktree-state'
import { defaultFileSearchState } from './file-search-state'

type ScopedStateMap = Record<string, FileSearchScopedStates>

export function defaultFileSearchScopedStates(): FileSearchScopedStates {
  return {
    explorer: defaultFileSearchState(),
    'source-control': defaultFileSearchState(),
    'pr-diff': defaultFileSearchState()
  }
}

export function readFileSearchScopeState(
  map: ScopedStateMap,
  worktreeId: string,
  scope: FileSearchScopeId
): FileSearchWorktreeState | undefined {
  return map[worktreeId]?.[scope]
}

export function mapFileSearchScopedStates(
  scopes: FileSearchScopedStates,
  transform: (state: FileSearchWorktreeState) => FileSearchWorktreeState
): FileSearchScopedStates {
  const next = { ...scopes }
  for (const scope of FILE_SEARCH_SCOPE_IDS) {
    next[scope] = transform(scopes[scope] ?? defaultFileSearchState())
  }
  return next
}

/** Rewrites one scope's slot, filling in defaults for a worktree seen for the first time. */
export function withFileSearchScopeState(
  map: ScopedStateMap,
  worktreeId: string,
  scope: FileSearchScopeId,
  update: (current: FileSearchWorktreeState) => FileSearchWorktreeState
): ScopedStateMap {
  const scopes = map[worktreeId] ?? defaultFileSearchScopedStates()
  return {
    ...map,
    [worktreeId]: { ...scopes, [scope]: update(scopes[scope] ?? defaultFileSearchState()) }
  }
}
