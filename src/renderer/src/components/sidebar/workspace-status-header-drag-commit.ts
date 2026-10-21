import { getWorkspaceStatusHeaderOrderForSidebarDrop } from './workspace-status-header-drop'
import type { WorkspaceStatusHeaderDragSession } from './workspace-status-header-drag-contract'

export function commitWorkspaceStatusHeaderDragDrop(args: {
  session: WorkspaceStatusHeaderDragSession
  sidebarDropIndex: number
  onCommitStatusHeaderOrder: (bucketKey: string, orderedHeaderKeys: readonly string[]) => void
}): void {
  const ordered = getWorkspaceStatusHeaderOrderForSidebarDrop({
    sidebarHeaderKeys: args.session.sidebarHeaderKeys,
    draggedHeaderKey: args.session.headerKey,
    sidebarDropIndex: args.sidebarDropIndex
  })
  if (!ordered) {
    return
  }
  args.onCommitStatusHeaderOrder(args.session.bucketKey, ordered)
}
