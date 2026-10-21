import type { PointerEvent } from 'react'

import type {
  WorkspaceStatusHeaderDragBucketKey,
  WorkspaceStatusHeaderDragRect
} from './workspace-status-header-drop'
import { REPO_HEADER_ACTION_SELECTOR } from './project-header-drag-contract'

export type WorkspaceStatusHeaderDragState = {
  draggingHeaderKey: string | null
  dropIndex: number | null
  dropIndicatorY: number | null
}

export const INITIAL_WORKSPACE_STATUS_HEADER_DRAG_STATE: WorkspaceStatusHeaderDragState = {
  draggingHeaderKey: null,
  dropIndex: null,
  dropIndicatorY: null
}

export type UseWorkspaceStatusHeaderDragArgs = {
  sidebarStatusHeaderKeysByBucket: ReadonlyMap<
    WorkspaceStatusHeaderDragBucketKey,
    readonly string[]
  >
  onCommitStatusHeaderOrder: (
    bucketKey: WorkspaceStatusHeaderDragBucketKey,
    orderedHeaderKeys: readonly string[]
  ) => void
  getScrollContainer: () => HTMLElement | null
}

export type WorkspaceStatusHeaderDragController = {
  state: WorkspaceStatusHeaderDragState
  onHandlePointerDown: (event: PointerEvent<HTMLElement>, headerKey: string) => void
}

export type WorkspaceStatusHeaderDragSession = {
  headerKey: string
  bucketKey: WorkspaceStatusHeaderDragBucketKey
  sidebarHeaderKeys: readonly string[]
  pointerId: number
  headerRects: WorkspaceStatusHeaderDragRect[]
  handleEl: HTMLElement
  startX: number
  startY: number
  latestPointerY: number
  promoted: boolean
}

export const WORKSPACE_STATUS_HEADER_DRAG_THRESHOLD_PX = 4

const WORKSPACE_STATUS_HEADER_DRAG_HANDLE_SELECTOR = '[data-workspace-status-header-drag-handle]'

export function isWorkspaceStatusHeaderDragHandleTarget(
  target: EventTarget | null,
  currentTarget: HTMLElement
): boolean {
  // Why: the band icon renders as an <svg>, so pressing it makes the event target
  // an SVGElement (not an HTMLElement); Element still answers closest/contains.
  if (!(target instanceof Element)) {
    return false
  }
  const dragHandle = target.closest(WORKSPACE_STATUS_HEADER_DRAG_HANDLE_SELECTOR)
  return dragHandle !== null && currentTarget.contains(dragHandle)
}

export function isWorkspaceStatusHeaderActionTarget(
  target: EventTarget | null,
  currentTarget: HTMLElement
): boolean {
  if (!(target instanceof Element) || target === currentTarget) {
    return false
  }
  return currentTarget.contains(target) && target.closest(REPO_HEADER_ACTION_SELECTOR) !== null
}
