import { toast } from 'sonner'
import { useAppStore } from '@/store'
import type { ExecutionHostId } from '../../../../shared/execution-host'
import { translate } from '@/i18n/i18n'
import { tearDownWorkspaceRuntimes } from './workspace-runtime-teardown'

function executionHostIdFor(
  worktreeId: string,
  preferredHostId?: ExecutionHostId
): ExecutionHostId {
  if (preferredHostId) {
    return preferredHostId
  }
  return (
    useAppStore
      .getState()
      .allWorktrees?.()
      .find((worktree) => worktree.id === worktreeId)?.hostId ?? 'local'
  )
}

async function setArchivedFlag(
  worktreeIds: readonly string[],
  isArchived: boolean,
  executionHostIdByWorktreeId?: Readonly<Record<string, ExecutionHostId | undefined>>
): Promise<void> {
  const { updateWorktreeMeta } = useAppStore.getState()
  const failures: string[] = []
  await Promise.all(
    worktreeIds.map(async (worktreeId) => {
      const result = await updateWorktreeMeta(worktreeId, { isArchived }, {
        executionHostId: executionHostIdFor(
          worktreeId,
          executionHostIdByWorktreeId?.[worktreeId]
        )
      })
      if (!result.ok) {
        failures.push(result.error)
      }
    })
  )
  if (failures.length > 0) {
    toast.error(
      isArchived
        ? translate('auto.components.sidebar.archive.worktree.flow.saveFailed', 'Failed to archive')
        : translate(
            'auto.components.sidebar.archive.worktree.flow.restoreFailed',
            'Failed to unarchive'
          ),
      { description: failures.join('\n') }
    )
  }
}

/**
 * Archive: release everything the workspace is running, then hide it from the
 * sidebar and the palettes. The checkout, its branch and its tab records are
 * untouched, so unarchiving brings it back as it was.
 *
 * Why the flag is written only for workspaces whose teardown succeeded: hiding
 * a workspace that is still holding PTYs would leave it burning CPU with no
 * card to reach it from.
 *
 * Not to be confused with the `orca.yaml` archive hook, which runs before a
 * workspace is *deleted*. Archiving deliberately does not run it.
 */
export async function runArchiveWorktrees(worktreeIds: readonly string[]): Promise<void> {
  if (worktreeIds.length === 0) {
    return
  }
  const { succeededIds, errors } = await tearDownWorkspaceRuntimes(worktreeIds, {
    stopBackgroundWork: true
  })
  if (errors.length > 0) {
    toast.error(
      worktreeIds.length === 1
        ? translate(
            'auto.components.sidebar.archive.worktree.flow.failed',
            'Failed to archive workspace'
          )
        : translate(
            'auto.components.sidebar.archive.worktree.flow.failedSome',
            'Failed to archive some workspaces'
          ),
      { description: errors.join('\n') }
    )
  }
  await setArchivedFlag(succeededIds, true)
}

export async function runArchiveWorktree(worktreeId: string): Promise<void> {
  await runArchiveWorktrees([worktreeId])
}

/** Clear the flag. The workspace wakes the normal way the next time it is opened. */
export async function runUnarchiveWorktrees(
  worktreeIds: readonly string[],
  executionHostIdByWorktreeId?: Readonly<Record<string, ExecutionHostId | undefined>>
): Promise<void> {
  if (worktreeIds.length === 0) {
    return
  }
  await setArchivedFlag(worktreeIds, false, executionHostIdByWorktreeId)
}
