import { describe, expect, it } from 'vitest'
import {
  buildLocalWorktreeCreateArgs,
  buildRuntimeWorktreeCreateParams
} from './worktree-create-payload'
import { WorktreeCreate } from '../../../../../../shared/rpc-contract/worktree-create-params'
import { FolderWorkspaceCreate } from '../../../../../../shared/rpc-contract/folder-workspace-params'
import { FolderWorkspaceCreateArgs } from '../../../../../../main/ipc/repos/repo-ipc-arg-schemas'
import {
  workspaceAutonomyForMode,
  workspaceIntentForMode
} from '../../../../../../shared/workspace-mode'

describe('workspace mode creation transports', () => {
  it.each(['ask', 'supervised', 'autonomous'] as const)(
    'preserves %s through local, remote, and folder creation',
    (mode) => {
      const metadata = {
        workspaceAutonomy: workspaceAutonomyForMode(mode),
        workspaceIntent: workspaceIntentForMode(mode)
      }
      const request = { repoId: 'repo-1', name: 'example', options: metadata }
      expect(buildLocalWorktreeCreateArgs(request, { name: 'example' })).toMatchObject(metadata)
      expect(
        WorktreeCreate.parse(buildRuntimeWorktreeCreateParams(request, { name: 'example' }))
      ).toMatchObject(metadata)
      const folderRequest = { projectGroupId: 'group-1', name: 'example', ...metadata }
      expect(FolderWorkspaceCreate.parse(folderRequest)).toMatchObject(metadata)
      expect(FolderWorkspaceCreateArgs.parse(folderRequest)).toMatchObject(metadata)
    }
  )
  it('keeps older clients valid when both new fields are absent', () => {
    const request = { repoId: 'repo-1', name: 'example' }
    expect(
      WorktreeCreate.parse(buildRuntimeWorktreeCreateParams(request, { name: 'example' }))
    ).not.toHaveProperty('workspaceIntent')
    expect(FolderWorkspaceCreate.parse({ projectGroupId: 'group-1' })).not.toHaveProperty(
      'workspaceAutonomy'
    )
  })
})
