import type { AppState } from '@/store/types'
import { getIndexedAllWorktrees } from '@/store/worktree-repo-index'
import type { WorkspaceStatusDefinition } from '../../../../shared/worktree/types'
import { hasWorkspaceStatusFlag } from '../../../../shared/workspace-status-automation'
import {
  advanceAutomationHold,
  isAutomationRunFinished,
  type AutomationHoldEntry
} from '../../../../shared/workspace-automation-hold'
import type { AutomationReleaseTarget } from '../../../../shared/workspace-automation-release-plan'
import { collectAgentsByWorktreeId } from './collect-workspace-agent-rule-targets'

// Why module state: the settle clock has to survive between ticks, and the worktree store is
// the user's data — a clock that only matters while the app runs does not belong in it.
const holdByWorktreeId = new Map<string, AutomationHoldEntry>()

export type AutomationHoldScope = {
  /** Workspaces a rule must not touch this tick. */
  heldWorktreeIds: Set<string>
  /** Every workspace in a holding lane, with whether its run has finished and settled. */
  releaseTargets: AutomationReleaseTarget[]
}

export function collectAutomationHoldScope(args: {
  state: AppState
  repoIds: readonly string[]
  workspaceStatuses: readonly WorkspaceStatusDefinition[]
  /** Worktrees with a pull request this tick, so a released one is left to the pull request rules. */
  pullRequestWorktreeIds: ReadonlySet<string>
  now: number
}): AutomationHoldScope {
  const { state, repoIds, workspaceStatuses, pullRequestWorktreeIds, now } = args
  const scopedRepoIds = new Set(repoIds)
  const agentsByWorktreeId = collectAgentsByWorktreeId(state, now)
  const scope: AutomationHoldScope = { heldWorktreeIds: new Set(), releaseTargets: [] }
  const seen = new Set<string>()

  for (const worktree of getIndexedAllWorktrees(state.worktreesByRepo)) {
    const status = worktree.workspaceStatus ?? null
    if (
      !scopedRepoIds.has(worktree.repoId) ||
      worktree.isArchived ||
      worktree.isBare ||
      worktree.isMainWorktree ||
      !status ||
      !hasWorkspaceStatusFlag(workspaceStatuses, status, 'holdsAutomation')
    ) {
      continue
    }
    seen.add(worktree.id)
    const { entry, released } = advanceAutomationHold({
      previous: holdByWorktreeId.get(worktree.id),
      isFinished: isAutomationRunFinished(agentsByWorktreeId.get(worktree.id) ?? []),
      now
    })
    if (entry) {
      holdByWorktreeId.set(worktree.id, entry)
    }
    if (!released) {
      scope.heldWorktreeIds.add(worktree.id)
    }
    scope.releaseTargets.push({
      worktreeId: worktree.id,
      executionHostId: worktree.hostId ?? 'local',
      currentStatus: status,
      isReleased: released,
      hasLinkedPullRequest: pullRequestWorktreeIds.has(worktree.id)
    })
  }

  // Why pruned: a workspace that left the lane must start its clock over if it comes back.
  for (const worktreeId of holdByWorktreeId.keys()) {
    if (!seen.has(worktreeId)) {
      holdByWorktreeId.delete(worktreeId)
    }
  }
  return scope
}

export function resetAutomationHoldsForTest(): void {
  holdByWorktreeId.clear()
}
