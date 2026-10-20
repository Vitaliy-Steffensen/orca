import { useCallback } from 'react'
import { useAppStore } from '@/store'
import { setGitHubHostedReviewAutoMerge } from '../hosted-review-github-actions'
import { selectWorkspaceActionContext } from '../workspace-actions/workspace-action-context'
import { canShowGitHubPRAutoMergeControl } from '../../../../../shared/github/pull-request-auto-merge-availability'
import {
  enableAutoMergePolicy,
  resolveAutoMergePolicy,
  type WorkspaceAutoMergePolicy
} from '../../../../../shared/workspace-auto-merge-policy'

type AutoMergeToggle = 'enabled' | 'resolveConflicts' | 'fixFailingChecks'

export function useAutoMergePolicy(): {
  available: boolean
  policy: WorkspaceAutoMergePolicy
  setToggle: (toggle: AutoMergeToggle, next: boolean) => void
} {
  const available = useAppStore((state) => {
    const context = selectWorkspaceActionContext(state)
    return Boolean(
      context?.pr?.prRepo &&
      context.worktree.linkedPR !== null &&
      canShowGitHubPRAutoMergeControl(context.pr)
    )
  })
  const worktree = useAppStore((state) => selectWorkspaceActionContext(state)?.worktree ?? null)
  const policy = resolveAutoMergePolicy(worktree)

  const setToggle = useCallback((toggle: AutoMergeToggle, next: boolean) => {
    const state = useAppStore.getState()
    const context = selectWorkspaceActionContext(state)
    if (!context) {
      return
    }
    const current = resolveAutoMergePolicy(context.worktree)
    const updated =
      toggle === 'enabled' && next
        ? enableAutoMergePolicy(context.worktree)
        : { ...current, [toggle]: next }
    void state.updateWorktreeMeta(context.worktree.id, { autoMerge: updated })
    // Why: Orca is the source of truth, so turning it off must also cancel GitHub's own auto-merge.
    if (toggle === 'enabled' && !next && context.pr?.prRepo && context.pr.autoMergeEnabled) {
      void setGitHubHostedReviewAutoMerge({
        repo: context.repo,
        prNumber: context.pr.number,
        enabled: false,
        prRepo: context.pr.prRepo
      })
    }
  }, [])

  return { available, policy, setToggle }
}
