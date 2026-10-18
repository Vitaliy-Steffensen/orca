import type { EditorGet, EditorSet } from '../types/editor-set-get'
import type { ActivityBarPosition } from '../types/open-file'
import type {
  ActiveRightSidebarTab,
  RightSidebarExplorerView
} from '../../../../../../shared/ui-chrome-types'
import { defaultFileSearchState } from '../search/file-search-state'
import {
  readFileSearchScopeState,
  withFileSearchScopeState
} from '../search/file-search-scope-update'

export type RightSidebarState = {
  rightSidebarOpen: boolean
  rightSidebarWidth: number
  rightSidebarTab: ActiveRightSidebarTab
  rightSidebarExplorerView: RightSidebarExplorerView
  rightSidebarRouteRequestId: number
  /** Set to ask the Agent Session Search panel to widen to all computers and focus its box. */
  aiVaultSearchFocusRequested: boolean
  rightSidebarTabByWorktree: Record<string, ActiveRightSidebarTab>
  rightSidebarExplorerViewByWorktree: Record<string, RightSidebarExplorerView>
  /** In memory: the find bar is shared chrome, and only one right-sidebar panel is mounted at a time. */
  rightSidebarFindExpanded: boolean
  rightSidebarFindFocusRequestId: number
  /** In memory: the tab the mounted sidebar renders, which differs from rightSidebarTab when that tab is hidden here. */
  rightSidebarEffectiveTab: ActiveRightSidebarTab | null
  activityBarPosition: ActivityBarPosition
  toggleRightSidebar: () => void
  setRightSidebarOpen: (open: boolean) => void
  setRightSidebarWidth: (width: number) => void
  setRightSidebarTab: (tab: ActiveRightSidebarTab) => void
  setRightSidebarExplorerView: (view: RightSidebarExplorerView) => void
  showRightSidebarFiles: () => void
  showRightSidebarSearch: (payload?: {
    query?: string | null
    includePattern?: string | null
  }) => void
  showAiVaultSearch: () => void
  clearAiVaultSearchFocusRequest: () => void
  setRightSidebarFindExpanded: (expanded: boolean) => void
  requestRightSidebarFind: () => void
  setRightSidebarEffectiveTab: (tab: ActiveRightSidebarTab | null) => void
  setActivityBarPosition: (position: ActivityBarPosition) => void
}

export function createRightSidebarState(set: EditorSet, _get: EditorGet): RightSidebarState {
  return {
    rightSidebarOpen: false,
    rightSidebarWidth: 280,
    rightSidebarTab: 'explorer',
    rightSidebarExplorerView: 'files',
    rightSidebarRouteRequestId: 0,
    aiVaultSearchFocusRequested: false,
    rightSidebarTabByWorktree: {},
    rightSidebarExplorerViewByWorktree: {},
    rightSidebarFindExpanded: false,
    rightSidebarFindFocusRequestId: 0,
    rightSidebarEffectiveTab: null,
    activityBarPosition: 'top',
    toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
    setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),
    setRightSidebarWidth: (width) => set({ rightSidebarWidth: width }),
    setRightSidebarTab: (tab) =>
      set((s) => ({
        rightSidebarTab: tab,
        rightSidebarRouteRequestId: s.rightSidebarRouteRequestId + 1,
        ...(tab === 'explorer' ? { rightSidebarExplorerView: 'files' as const } : {})
      })),
    setRightSidebarExplorerView: (view) =>
      set((s) => ({
        rightSidebarExplorerView: view,
        rightSidebarRouteRequestId: s.rightSidebarRouteRequestId + 1,
        ...(s.activeWorktreeId
          ? {
              rightSidebarExplorerViewByWorktree: {
                ...s.rightSidebarExplorerViewByWorktree,
                [s.activeWorktreeId]: view
              }
            }
          : {})
      })),
    showRightSidebarFiles: () =>
      set((s) => ({
        rightSidebarOpen: true,
        rightSidebarTab: 'explorer',
        rightSidebarExplorerView: 'files',
        rightSidebarRouteRequestId: s.rightSidebarRouteRequestId + 1,
        ...(s.activeWorktreeId
          ? {
              rightSidebarExplorerViewByWorktree: {
                ...s.rightSidebarExplorerViewByWorktree,
                [s.activeWorktreeId]: 'files'
              }
            }
          : {})
      })),
    showRightSidebarSearch: (payload) =>
      set((s) => {
        // Why: Source Control searches its own changed files, so the find chord opens its bar
        // rather than yanking the user over to the Explorer.
        if (!payload && s.rightSidebarTab === 'source-control') {
          return {
            rightSidebarOpen: true,
            rightSidebarFindExpanded: true,
            rightSidebarFindFocusRequestId: s.rightSidebarFindFocusRequestId + 1
          }
        }
        const next = {
          rightSidebarOpen: true,
          rightSidebarTab: 'explorer' as const,
          rightSidebarExplorerView: 'search' as const,
          rightSidebarRouteRequestId: s.rightSidebarRouteRequestId + 1,
          rightSidebarFindExpanded: true,
          rightSidebarFindFocusRequestId: s.rightSidebarFindFocusRequestId + 1,
          ...(s.activeWorktreeId
            ? {
                rightSidebarExplorerViewByWorktree: {
                  ...s.rightSidebarExplorerViewByWorktree,
                  [s.activeWorktreeId]: 'search' as const
                }
              }
            : {})
        }
        if (!s.activeWorktreeId) {
          return next
        }

        const query = payload?.query?.trim() ? payload.query : null
        const includePattern = payload?.includePattern?.trim() ? payload.includePattern : null
        const current =
          readFileSearchScopeState(s.fileSearchStateByWorktree, s.activeWorktreeId, 'explorer') ||
          defaultFileSearchState()
        const shouldSeed = Boolean(query || (includePattern && current.query.trim()))
        const shouldFocus = !shouldSeed
        const nextSearchState = {
          ...current,
          ...(query ? { query } : {}),
          ...(includePattern ? { includePattern } : {}),
          ...(shouldSeed
            ? {
                results: null,
                resultOwner: null,
                loading: false,
                collapsedFiles: new Set<string>(),
                seedRequestId: (current.seedRequestId ?? 0) + 1
              }
            : {}),
          ...(shouldFocus ? { focusRequestId: (current.focusRequestId ?? 0) + 1 } : {})
        }

        return {
          ...next,
          fileSearchStateByWorktree: withFileSearchScopeState(
            s.fileSearchStateByWorktree,
            s.activeWorktreeId,
            'explorer',
            () => nextSearchState
          )
        }
      }),
    // Settings sends the user here; the panel owns scope, so this asks rather than writes.
    showAiVaultSearch: () =>
      set((s) => ({
        rightSidebarOpen: true,
        rightSidebarTab: 'vault' as const,
        rightSidebarRouteRequestId: s.rightSidebarRouteRequestId + 1,
        aiVaultSearchFocusRequested: true
      })),
    clearAiVaultSearchFocusRequest: () => set({ aiVaultSearchFocusRequested: false }),
    setRightSidebarFindExpanded: (expanded) => set({ rightSidebarFindExpanded: expanded }),
    requestRightSidebarFind: () =>
      set((s) => ({
        rightSidebarFindExpanded: true,
        rightSidebarFindFocusRequestId: s.rightSidebarFindFocusRequestId + 1
      })),
    setRightSidebarEffectiveTab: (tab) =>
      set((s) => (s.rightSidebarEffectiveTab === tab ? {} : { rightSidebarEffectiveTab: tab })),
    setActivityBarPosition: (position) => set({ activityBarPosition: position })
  }
}
