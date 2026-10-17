import { requestCombinedDiffTreeReveal } from '@/lib/combined-diff-tree-reveal-request'
import { getSourceControlReviewOrder } from '@/lib/source-control-review-order'
import { requestSourceControlRowReveal } from '@/lib/source-control-row-reveal'
import {
  buildChangedFileOrder,
  resolveCurrentRowKey
} from '../store/slices/editor/actions/changed-file-order'
import { isCombinedDiffSource } from '../../../shared/editor-tab-view-types'
import { useAppStore } from '../store'
import type { OpenFile } from '../store/slices/editor'
import type { KeybindingActionId } from '../../../shared/keybindings/types'

type ClaimShortcut = (actionId: KeybindingActionId, run: () => void) => boolean
type AppStoreState = ReturnType<typeof useAppStore.getState>

/**
 * The row the tab would occupy in the Source Control panel, or null when the file has no diff.
 *
 * Why the panel's published order first: it honours the filter, the collapsed directories and the
 * grouping, none of which the raw git arrays carry. The raw order keeps this answerable when the
 * panel has never mounted. Same pairing as step-to-changed-file.
 */
function resolveSourceControlRowKey(state: AppStoreState, file: OpenFile): string | null {
  const order =
    getSourceControlReviewOrder(file.worktreeId) ??
    buildChangedFileOrder(
      state.gitStatusByWorktree[file.worktreeId] ?? [],
      state.gitBranchChangesByWorktree[file.worktreeId] ?? []
    )
  return resolveCurrentRowKey(order, file.diffSource, file.relativePath ?? null)
}

/**
 * `view.revealActiveFile`: show where the current tab lives in whichever tree can show it.
 *
 * A combined diff spans many files, so only the viewer knows which section is on screen — it gets
 * asked. Otherwise the destination follows the sidebar tab the user is actually on, falling back to
 * the Explorer when Source Control has no row for the file.
 */
export function takeRevealActiveFileShortcut(
  claim: ClaimShortcut,
  canRevealRightSidebar: boolean
): boolean {
  const state = useAppStore.getState()
  const { activeFileId, activeWorktreeId, openFiles } = state
  const activeFile = openFiles.find((file) => file.id === activeFileId)
  if (!activeFile || !activeWorktreeId || activeFile.worktreeId !== activeWorktreeId) {
    return false
  }

  if (activeFile.mode === 'diff' && isCombinedDiffSource(activeFile.diffSource)) {
    const fileId = activeFile.id
    return claim('view.revealActiveFile', () => requestCombinedDiffTreeReveal(fileId))
  }

  // conflict-review carries the worktree root, check-details and chat-visual a synthetic id.
  const revealable =
    activeFile.mode === 'edit' ||
    activeFile.mode === 'markdown-preview' ||
    activeFile.mode === 'diff'
  if (!revealable || !canRevealRightSidebar) {
    return false
  }

  // A shut sidebar reopens on the tab it was last showing for this worktree.
  const targetTab = state.rightSidebarOpen
    ? state.rightSidebarTab
    : (state.rightSidebarTabByWorktree[activeWorktreeId] ?? state.rightSidebarTab)
  const rowKey =
    targetTab === 'source-control' ? resolveSourceControlRowKey(state, activeFile) : null

  if (rowKey) {
    const { worktreeId } = activeFile
    return claim('view.revealActiveFile', () => {
      state.setRightSidebarOpen(true)
      state.setRightSidebarTab('source-control')
      requestSourceControlRowReveal(worktreeId, rowKey)
    })
  }

  const { filePath, worktreeId } = activeFile
  return claim('view.revealActiveFile', () => state.revealInExplorer(worktreeId, filePath))
}
