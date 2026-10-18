import type { WorktreeMeta } from './worktree/meta-types'
import type { WorkspaceStatus } from './worktree/types'

/**
 * A lane the user chose by hand. Agent rules stand down for a workspace carrying one, so a
 * card dragged somewhere deliberately is never dragged back by the next tick.
 */
export type WorkspaceStatusManualOverride = {
  status: WorkspaceStatus
  /** When the user made the move. The override is spent by the first agent turn that starts after it. */
  at: number
}

/** Mark a user-made status change, so the move survives until the workspace reaches a new stage. */
export function stampManualWorkspaceStatusOverride<T extends Partial<WorktreeMeta>>(
  updates: T,
  now: number
): T {
  return updates.workspaceStatus === undefined
    ? updates
    : { ...updates, agentRuleManualOverride: { status: updates.workspaceStatus, at: now } }
}

/**
 * Whether the override has been spent. Why a turn and not a timer: the point is that a hand-made
 * decision survives the stage it was made in, and a stage ends when the agent starts the next turn.
 */
export function isManualWorkspaceStatusOverrideSpent(
  override: WorkspaceStatusManualOverride,
  currentStatus: WorkspaceStatus | null,
  turnStartTimes: readonly number[]
): boolean {
  // Why the status check: a later move — by hand or by a pull request rule — replaces the
  // decision this override recorded, and holding agent rules off for it would outlive its point.
  if (currentStatus !== override.status) {
    return true
  }
  return turnStartTimes.some((startedAt) => startedAt > override.at)
}
