import { describe, expect, it } from 'vitest'
import { resolveWorkspaceAutonomy } from '../shared/workspace-autonomy'
import type { GitWorktreeInfo } from '../shared/worktree/types'
import type { Repo } from '../shared/repo-types'
import { mergeWorktree } from './ipc/worktree-metadata-merge'
import { mergeFolderWorkspace } from './ipc/worktrees/folder-workspace-model'
import { mergeRuntimeFolderWorkspace } from './runtime/runtime-folder-workspace'

const git: GitWorktreeInfo = {
  path: '/workspace/feature',
  head: 'abc123',
  branch: 'refs/heads/feature',
  isBare: false,
  isMainWorktree: false
}

const meta = {
  displayName: 'feature',
  comment: '',
  linkedIssue: null,
  linkedPR: null,
  linkedLinearIssue: null,
  isArchived: false,
  isUnread: false,
  isPinned: false,
  sortOrder: 0,
  lastActivityAt: 0
}

// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the folder projections read only id, path and displayName off the repo.
const folderRepo = {
  id: 'repo-1',
  path: '/workspace/app',
  displayName: 'app'
} as unknown as Repo

describe('unset autonomy reads as supervised in every workspace projection', () => {
  it('git worktrees', () => {
    expect(mergeWorktree('repo-1', git, meta).workspaceAutonomy).toBe('supervised')
    expect(mergeWorktree('repo-1', git, undefined).workspaceAutonomy).toBe('supervised')
  })

  it('folder workspaces on the desktop host', () => {
    expect(mergeFolderWorkspace(folderRepo, 'repo-1::/workspace/app', meta).workspaceAutonomy).toBe(
      'supervised'
    )
  })

  it('folder workspaces on a runtime host', () => {
    expect(
      mergeRuntimeFolderWorkspace(folderRepo, 'repo-1::/workspace/app', {}).workspaceAutonomy
    ).toBe('supervised')
  })
})

describe('an explicit clearance survives projection', () => {
  it('on a git worktree', () => {
    expect(
      mergeWorktree('repo-1', git, { ...meta, workspaceAutonomy: 'autonomous' }).workspaceAutonomy
    ).toBe('autonomous')
  })

  it('on a folder workspace', () => {
    expect(
      resolveWorkspaceAutonomy(
        mergeRuntimeFolderWorkspace(folderRepo, 'repo-1::/workspace/app', {
          workspaceAutonomy: 'autonomous'
        }).workspaceAutonomy
      )
    ).toBe('autonomous')
  })
})
