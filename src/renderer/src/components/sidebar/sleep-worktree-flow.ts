import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { tearDownWorkspaceRuntimes } from './workspace-runtime-teardown'

/**
 * Shared "sleep worktree" flow (close all panels to free memory / CPU)
 * used by WorktreeContextMenu and MemoryStatusSegment's per-row hover action.
 *
 * Sleep keeps the workspace in the sidebar and leaves its background work
 * (language servers, structured agent sessions) alone; archive is the stronger
 * form. Both share {@link tearDownWorkspaceRuntimes}.
 */
export async function runSleepWorktree(worktreeId: string): Promise<void> {
  await runSleepWorktrees([worktreeId])
}

export async function runSleepWorktrees(worktreeIds: readonly string[]): Promise<void> {
  if (worktreeIds.length === 0) {
    return
  }
  const { errors } = await tearDownWorkspaceRuntimes(worktreeIds)
  if (errors.length > 0) {
    // Why: callers are fire-and-forget; surface actionable teardown failures after restoring retryable UI state.
    toast.error(
      worktreeIds.length === 1
        ? translate(
            'auto.components.sidebar.sleep.worktree.flow.8bc3fc0671',
            'Failed to sleep workspace'
          )
        : translate(
            'auto.components.sidebar.sleep.worktree.flow.c460fecc4a',
            'Failed to sleep some workspaces'
          ),
      {
        description: errors.join('\n')
      }
    )
  }
}
