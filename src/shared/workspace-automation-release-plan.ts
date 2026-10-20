import type { ExecutionHostId } from './execution-host'
import type { WorkspaceStatus } from './worktree/types'

/** A workspace sitting in a holding lane, flattened so planning stays pure. */
export type AutomationReleaseTarget = {
  worktreeId: string
  executionHostId: ExecutionHostId
  currentStatus: WorkspaceStatus
  /** Its run is over and has stayed over. */
  isReleased: boolean
  /** The pull request rules already own a released workspace, so this plan leaves it alone. */
  hasLinkedPullRequest: boolean
}

export type AutomationReleaseUpdate = {
  worktreeId: string
  executionHostId: ExecutionHostId
  status: WorkspaceStatus
}

/**
 * Where a finished run goes when there is no pull request to decide for it. A workspace that
 * does have one falls through to {@link buildWorkspaceStatusRulePlan}, which picks the lane
 * that fits its state instead of this single fallback.
 */
export function planAutomationReleases(
  targets: readonly AutomationReleaseTarget[],
  releaseStatus: WorkspaceStatus | null
): AutomationReleaseUpdate[] {
  if (!releaseStatus) {
    return []
  }
  return targets.flatMap((target) =>
    target.isReleased && !target.hasLinkedPullRequest && target.currentStatus !== releaseStatus
      ? [
          {
            worktreeId: target.worktreeId,
            executionHostId: target.executionHostId,
            status: releaseStatus
          }
        ]
      : []
  )
}
