import type { PointerEvent } from 'react'

import {
  measureWorkspaceStatusHeaderDragRects,
  type WorkspaceStatusHeaderDragBucketKey
} from './workspace-status-header-drop'
import {
  isWorkspaceStatusHeaderActionTarget,
  isWorkspaceStatusHeaderDragHandleTarget,
  type WorkspaceStatusHeaderDragSession
} from './workspace-status-header-drag-contract'

export function createWorkspaceStatusHeaderDragSession(args: {
  event: PointerEvent<HTMLElement>
  headerKey: string
  sidebarStatusHeaderKeysByBucket: ReadonlyMap<
    WorkspaceStatusHeaderDragBucketKey,
    readonly string[]
  >
  getScrollContainer: () => HTMLElement | null
}): WorkspaceStatusHeaderDragSession | null {
  if (args.event.button !== 0) {
    return null
  }
  if (!isWorkspaceStatusHeaderDragHandleTarget(args.event.target, args.event.currentTarget)) {
    return null
  }
  if (isWorkspaceStatusHeaderActionTarget(args.event.target, args.event.currentTarget)) {
    return null
  }
  let bucketKey: WorkspaceStatusHeaderDragBucketKey | null = null
  let sidebarHeaderKeys: readonly string[] = []
  for (const [candidate, keys] of args.sidebarStatusHeaderKeysByBucket) {
    if (keys.includes(args.headerKey)) {
      bucketKey = candidate
      sidebarHeaderKeys = keys
      break
    }
  }
  // Why: a lone band, or the only lane in a band, has nowhere to move to.
  if (bucketKey === null || sidebarHeaderKeys.length <= 1) {
    return null
  }
  const container = args.getScrollContainer()
  if (!container) {
    return null
  }
  // Why: defer pointer capture until the threshold so an ordinary header click
  // still toggles collapse through the row handler.
  return {
    headerKey: args.headerKey,
    bucketKey,
    sidebarHeaderKeys,
    pointerId: args.event.pointerId,
    headerRects: measureWorkspaceStatusHeaderDragRects(container, bucketKey),
    handleEl: args.event.currentTarget,
    startX: args.event.clientX,
    startY: args.event.clientY,
    latestPointerY: args.event.clientY,
    promoted: false
  }
}
