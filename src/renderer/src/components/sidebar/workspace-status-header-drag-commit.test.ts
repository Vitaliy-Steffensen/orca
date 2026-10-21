import { describe, expect, it, vi } from 'vitest'

import { commitWorkspaceStatusHeaderDragDrop } from './workspace-status-header-drag-commit'
import type { WorkspaceStatusHeaderDragSession } from './workspace-status-header-drag-contract'

function session(
  overrides: Partial<WorkspaceStatusHeaderDragSession> = {}
): WorkspaceStatusHeaderDragSession {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the commit reads only the header key, bucket and sibling keys.
  return {
    headerKey: 'band:b',
    bucketKey: 'workspace-status-sections',
    sidebarHeaderKeys: ['band:a', 'band:b', 'band:c'],
    ...overrides
  } as WorkspaceStatusHeaderDragSession
}

describe('commitWorkspaceStatusHeaderDragDrop', () => {
  it('reports the new sibling order for its bucket', () => {
    const onCommitStatusHeaderOrder = vi.fn()
    commitWorkspaceStatusHeaderDragDrop({
      session: session(),
      sidebarDropIndex: 0,
      onCommitStatusHeaderOrder
    })

    expect(onCommitStatusHeaderOrder).toHaveBeenCalledWith('workspace-status-sections', [
      'band:b',
      'band:a',
      'band:c'
    ])
  })

  it('stays silent when the drop changes nothing', () => {
    const onCommitStatusHeaderOrder = vi.fn()
    commitWorkspaceStatusHeaderDragDrop({
      session: session(),
      sidebarDropIndex: 1,
      onCommitStatusHeaderOrder
    })

    expect(onCommitStatusHeaderOrder).not.toHaveBeenCalled()
  })
})
