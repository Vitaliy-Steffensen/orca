import { readIpcErrorDetail } from '@/lib/ipc-error'
import { translate } from '@/i18n/i18n'
import { useCallback, useEffect, useRef } from 'react'
import { getConnectionId } from '@/lib/connection-context'
import {
  createFileSearchResultOwner,
  type FileSearchResultOwner
} from '@/lib/file-search-result-owner'
import {
  createEmptyRuntimeFileSearchResult,
  getRuntimeFileSearchRejectedField
} from '@/runtime/runtime-file-search-bounds'
import { searchRuntimeFiles } from '@/runtime/runtime-file-search-client'
import { useAppStore } from '@/store'
import {
  getExecutionHostIdForWorktree,
  getRuntimeEnvironmentIdForWorktree
} from '@/lib/worktree-runtime-owner'
import type { SearchResult } from '../../../../shared/code-search-types'
import { runtimeTargetForOwnerEnvironment } from '@/runtime/runtime-client-target'
import { restrictSearchResultToPaths } from '../../../../shared/search-result-path-restriction'
import type { FileSearchScopeId } from '@/store/slices/editor/types/file-search-scope-id'
import type { FileSearchPathRestriction } from './file-search-path-restriction'

const SEARCH_DEBOUNCE_MS = 300
const SEARCH_MAX_RESULTS = 2000

/**
 * The guaranteed floor: an older host drops `restrictToPaths` and searches everything,
 * so filter here regardless. A result that still carries outside files proves the host
 * ignored the restriction, in which case its own truncation verdict stands.
 */
function confineResults(
  results: SearchResult,
  restriction: FileSearchPathRestriction | null
): SearchResult {
  if (!restriction) {
    return results
  }
  return restrictSearchResultToPaths(results, new Set(restriction.paths)).result
}

type UpdateSearchState = (updates: {
  error?: string | null
  loading?: boolean
  results?: SearchResult | null
  resultOwner?: FileSearchResultOwner | null
}) => void

type UseFileSearchRunnerArgs = {
  activeWorktreeId: string | null
  worktreePath: string | null
  scope: FileSearchScopeId
  /** Confines the search to these paths; `null` searches the whole tree. */
  restriction: FileSearchPathRestriction | null
  updateActiveSearchState: UpdateSearchState
}

export function useFileSearchRunner({
  activeWorktreeId,
  worktreePath,
  scope,
  restriction,
  updateActiveSearchState
}: UseFileSearchRunnerArgs): {
  executeSearch: (query: string) => void
  cancelPendingSearch: () => void
} {
  const runtimeEnvironmentId = useAppStore((state) =>
    getRuntimeEnvironmentIdForWorktree(state, activeWorktreeId)
  )
  const executionHostId = useAppStore((state) =>
    getExecutionHostIdForWorktree(state, activeWorktreeId)
  )
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Why: runtime searches can finish out of order; ids keep stale results
  // from overwriting the newest query state.
  const latestSearchIdRef = useRef(0)
  const searchControllerRef = useRef<AbortController | null>(null)

  const cancelPendingSearch = useCallback(() => {
    const interrupted = searchControllerRef.current !== null || searchTimerRef.current !== null
    searchControllerRef.current?.abort()
    searchControllerRef.current = null
    latestSearchIdRef.current += 1
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
      searchTimerRef.current = null
    }
    updateActiveSearchState({
      loading: false,
      ...(interrupted ? { results: null, resultOwner: null } : {})
    })
  }, [updateActiveSearchState])

  const executeSearch = useCallback(
    (query: string) => {
      searchControllerRef.current?.abort()
      searchControllerRef.current = null
      latestSearchIdRef.current += 1
      const searchId = latestSearchIdRef.current
      updateActiveSearchState({ error: null })

      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
        searchTimerRef.current = null
      }

      if (!worktreePath || !activeWorktreeId) {
        updateActiveSearchState({ results: null, resultOwner: null, loading: false })
        return
      }

      const currentSearchState =
        useAppStore.getState().fileSearchStateByWorktree[activeWorktreeId]?.[scope]
      if (
        getRuntimeFileSearchRejectedField({
          query,
          includePattern: currentSearchState?.includePattern || undefined,
          excludePattern: currentSearchState?.excludePattern || undefined
        })
      ) {
        updateActiveSearchState({
          results: createEmptyRuntimeFileSearchResult(),
          resultOwner: createFileSearchResultOwner(activeWorktreeId, runtimeEnvironmentId, {
            rootPath: worktreePath,
            executionHostId
          }),
          loading: false
        })
        return
      }

      if (!query.trim()) {
        updateActiveSearchState({ results: null, resultOwner: null, loading: false })
        return
      }

      // Why: nothing to search, and an empty list on the wire would read as "unrestricted" to the host.
      if (restriction && restriction.paths.length === 0) {
        updateActiveSearchState({
          results: createEmptyRuntimeFileSearchResult(),
          resultOwner: createFileSearchResultOwner(activeWorktreeId, runtimeEnvironmentId, {
            rootPath: worktreePath,
            executionHostId
          }),
          loading: false
        })
        return
      }

      updateActiveSearchState({ loading: true })
      searchTimerRef.current = setTimeout(async () => {
        searchTimerRef.current = null
        // Why: results can outlive the selected worktree; clicks must reuse the route that produced them.
        const resultOwner = createFileSearchResultOwner(activeWorktreeId, runtimeEnvironmentId, {
          rootPath: worktreePath,
          executionHostId
        })
        const controller = new AbortController()
        searchControllerRef.current = controller
        try {
          const state = useAppStore.getState()
          const connectionId = getConnectionId(activeWorktreeId) ?? undefined
          const activeSearchState = state.fileSearchStateByWorktree[activeWorktreeId]?.[scope]
          if (
            getRuntimeFileSearchRejectedField({
              query,
              includePattern: activeSearchState?.includePattern || undefined,
              excludePattern: activeSearchState?.excludePattern || undefined
            })
          ) {
            if (latestSearchIdRef.current === searchId) {
              updateActiveSearchState({
                results: createEmptyRuntimeFileSearchResult(),
                resultOwner,
                loading: false
              })
            }
            return
          }
          const results = await searchRuntimeFiles(
            {
              target: runtimeTargetForOwnerEnvironment(runtimeEnvironmentId),
              worktreeId: activeWorktreeId,
              worktreePath,
              connectionId
            },
            {
              query: query.trim(),
              rootPath: worktreePath,
              caseSensitive: activeSearchState?.caseSensitive ?? false,
              wholeWord: activeSearchState?.wholeWord ?? false,
              useRegex: activeSearchState?.useRegex ?? false,
              includePattern: activeSearchState?.includePattern || undefined,
              excludePattern: activeSearchState?.excludePattern || undefined,
              maxResults: SEARCH_MAX_RESULTS,
              restrictToPaths: restriction ? [...restriction.paths] : undefined
            },
            controller.signal
          )
          if (latestSearchIdRef.current === searchId) {
            updateActiveSearchState({ results: confineResults(results, restriction), resultOwner })
          }
        } catch (err) {
          if (controller.signal.aborted) {
            return
          }
          console.error('Search failed:', err)
          if (latestSearchIdRef.current === searchId) {
            updateActiveSearchState({
              results: null,
              error:
                readIpcErrorDetail(err) ??
                translate('fileSearch.failed', 'Search failed. Try again.'),
              resultOwner
            })
          }
        } finally {
          if (searchControllerRef.current === controller) {
            searchControllerRef.current = null
          }
          if (latestSearchIdRef.current === searchId) {
            updateActiveSearchState({ loading: false })
          }
        }
      }, SEARCH_DEBOUNCE_MS)
    },
    [
      activeWorktreeId,
      updateActiveSearchState,
      worktreePath,
      executionHostId,
      runtimeEnvironmentId,
      scope,
      restriction
    ]
  )

  useEffect(
    () => cancelPendingSearch,
    [cancelPendingSearch, worktreePath, executionHostId, runtimeEnvironmentId]
  )

  return { executeSearch, cancelPendingSearch }
}
