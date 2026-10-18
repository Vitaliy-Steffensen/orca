import { activateAndRevealWorktree } from '@/lib/worktree-activation'
import type { Worktree } from '../../../shared/worktree/types'
import { runUnarchiveWorktrees } from '@/components/sidebar/archive-worktree-flow'

/** Unarchive when the match was hidden, then reveal it the way a palette open does. */
export async function openPromptMatchedWorkspace(worktree: Worktree): Promise<boolean> {
  const executionHostId = worktree.hostId
  if (worktree.isArchived) {
    await runUnarchiveWorktrees(
      [worktree.id],
      executionHostId ? { [worktree.id]: executionHostId } : undefined
    )
  }
  const activation = activateAndRevealWorktree(worktree.id, {
    navigationIntent: 'user-open',
    ...(executionHostId ? { executionHostId } : {})
  })
  return activation !== false
}
