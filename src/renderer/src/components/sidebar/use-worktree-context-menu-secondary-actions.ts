import { useCallback } from 'react'
import type { useAppStore } from '@/store'
import type { Worktree } from '../../../../shared/worktree/types'
import { unnestWorktrees } from './worktree-unnest'
import { shouldSuppressContextMenuFollowUpClick } from './worktree-context-menu-policy'

export function useWorktreeContextMenuSecondaryActions(args: {
  activeContextWorktrees: readonly Worktree[]
  contextMenuOpenedAtRef: React.MutableRefObject<number | null>
  updateWorktreeLineage: ReturnType<typeof useAppStore.getState>['updateWorktreeLineage']
}) {
  const handleRemoveParentLink = useCallback(() => {
    void unnestWorktrees(
      args.activeContextWorktrees.map((item) => item.id),
      args.updateWorktreeLineage
    )
  }, [args])
  const suppressOpeningPointerEvent = useCallback(
    (event: React.SyntheticEvent) => {
      const openedAt = args.contextMenuOpenedAtRef.current
      if (openedAt == null || !shouldSuppressContextMenuFollowUpClick(openedAt, Date.now())) {
        if (openedAt != null) {
          args.contextMenuOpenedAtRef.current = null
        }
        return
      }
      event.preventDefault()
      event.stopPropagation()
      if (event.type === 'click') {
        args.contextMenuOpenedAtRef.current = null
      }
    },
    [args]
  )
  return { handleRemoveParentLink, suppressOpeningPointerEvent }
}

export function focusWorktreeSidebarAfterContextMenu(
  event: Event,
  pendingParentPicker: boolean,
  openPendingParentPicker: () => void,
  scope: HTMLElement | null
): void {
  // Why: Radix otherwise restores focus to the hidden context-menu trigger.
  // When Sleep/Delete clears the active workspace and remounts the sidebar,
  // that focus restore can scroll the virtual list away from the row the
  // user just acted on.
  event.preventDefault()
  if (pendingParentPicker) {
    window.setTimeout(openPendingParentPicker, 0)
    return
  }
  const sidebar = scope?.closest('[data-worktree-sidebar]')
  if (sidebar instanceof HTMLElement) {
    sidebar.focus({ preventScroll: true })
  }
}
