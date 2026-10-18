import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WORKSPACE_AUTONOMY,
  isAutonomousWorkspace,
  isWorkspaceAutonomyValue,
  resolveWorkspaceAutonomy
} from './workspace-autonomy'
import { folderWorkspaceToWorktree } from './folder-workspace-worktree'
import type { FolderWorkspace } from './folder-workspace-types'

const folderWorkspace: FolderWorkspace = {
  id: 'fw-1',
  projectGroupId: 'group-1',
  name: 'app',
  folderPath: '/workspace/app',
  linkedTask: null,
  comment: '',
  isArchived: false,
  isUnread: false,
  isPinned: false,
  sortOrder: 0,
  lastActivityAt: 0,
  createdAt: 0,
  updatedAt: 0
}

describe('resolveWorkspaceAutonomy', () => {
  it('defaults to supervised', () => {
    expect(DEFAULT_WORKSPACE_AUTONOMY).toBe('supervised')
  })

  it('reads unset, null and junk as supervised', () => {
    for (const value of [undefined, null, '', 'afk', 'AUTONOMOUS', 7, {}]) {
      expect(resolveWorkspaceAutonomy(value)).toBe('supervised')
    }
  })

  it('keeps the two real values', () => {
    expect(resolveWorkspaceAutonomy('autonomous')).toBe('autonomous')
    expect(resolveWorkspaceAutonomy('supervised')).toBe('supervised')
    expect(isWorkspaceAutonomyValue('autonomous')).toBe(true)
    expect(isWorkspaceAutonomyValue('afk')).toBe(false)
  })

  it('treats a workspace without the field as not autonomous', () => {
    expect(isAutonomousWorkspace({})).toBe(false)
    expect(isAutonomousWorkspace(undefined)).toBe(false)
    expect(isAutonomousWorkspace({ workspaceAutonomy: 'autonomous' })).toBe(true)
  })
})

describe('folder workspace catalog rows', () => {
  it('read as supervised when autonomy was never set', () => {
    const projected = folderWorkspaceToWorktree(folderWorkspace)
    expect(resolveWorkspaceAutonomy(projected.workspaceAutonomy)).toBe('supervised')
  })

  it('carry an explicit autonomous clearance', () => {
    const projected = folderWorkspaceToWorktree({
      ...folderWorkspace,
      workspaceAutonomy: 'autonomous'
    })
    expect(resolveWorkspaceAutonomy(projected.workspaceAutonomy)).toBe('autonomous')
  })
})
