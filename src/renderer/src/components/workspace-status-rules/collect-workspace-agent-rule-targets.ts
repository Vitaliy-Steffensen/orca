import type { AppState } from '@/store/types'
import { isExplicitAgentStatusFresh } from '@/lib/agent-status'
import {
  mergeAgentStatusOrchestration,
  resolveAgentStatusWorktreeId
} from '@/lib/agent-status-worktree-attribution'
import { getIndexedAllWorktrees } from '@/store/worktree-repo-index'
import {
  AGENT_STATUS_STALE_AFTER_MS,
  type AgentStatusEntry
} from '../../../../shared/agent-status-types'
import { agentVerdictDisplayMark } from '../../../../shared/agent-main-agent-verdict'
import type { WorkspaceAgentObservation } from '../../../../shared/workspace-agent-status-rules'
import type { WorkspaceAgentRuleTarget } from '../../../../shared/workspace-agent-status-rule-plan'

/** Why excluded: a teammate or dispatched worker reporting to its coordinator is not the
 *  user's attention to give, and `agent-status-child-work-*` is not read here at all. */
function isMainAgentRow(entry: AgentStatusEntry): boolean {
  return entry.subagentObservation === undefined && entry.orchestration?.parentPaneKey === undefined
}

function toObservation(entry: AgentStatusEntry): WorkspaceAgentObservation {
  // Why mainAgent first: the row's combined state reports live child work, and a main agent
  // parked on a question while a subagent runs still needs an answer.
  const state = entry.mainAgent?.state ?? entry.state
  return {
    state,
    hasQuestion: Boolean(entry.interactivePrompt),
    verdict: agentVerdictDisplayMark(entry),
    turnStartedAt: entry.turnStartedAt ?? entry.stateStartedAt
  }
}

export function collectAgentsByWorktreeId(
  state: AppState,
  now: number
): Map<string, WorkspaceAgentObservation[]> {
  const worktreeIdByTabId = new Map<string, string>()
  for (const [worktreeId, tabs] of Object.entries(state.tabsByWorktree)) {
    for (const tab of tabs) {
      worktreeIdByTabId.set(tab.id, worktreeId)
    }
  }
  const byWorktreeId = new Map<string, WorkspaceAgentObservation[]>()
  for (const [paneKey, entry] of Object.entries(state.agentStatusByPaneKey)) {
    if (!isMainAgentRow(entry) || entry.restoredUnconfirmed) {
      continue
    }
    // Why freshness gates this: a row nobody has heard from is not evidence of a lane.
    if (!isExplicitAgentStatusFresh(entry, now, AGENT_STATUS_STALE_AFTER_MS)) {
      continue
    }
    const worktreeId = resolveAgentStatusWorktreeId(
      entry,
      worktreeIdByTabId,
      mergeAgentStatusOrchestration(entry, state.runtimeAgentOrchestrationByPaneKey?.[paneKey])
    )
    if (!worktreeId) {
      continue
    }
    const agents = byWorktreeId.get(worktreeId)
    if (agents) {
      agents.push(toObservation(entry))
    } else {
      byWorktreeId.set(worktreeId, [toObservation(entry)])
    }
  }
  return byWorktreeId
}

export function collectWorkspaceAgentRuleTargets(args: {
  state: AppState
  repoIds: readonly string[]
  /** Worktrees a pull request rule owns this tick; see AGENT_RULES_YIELD_TO_LINKED_PULL_REQUEST. */
  pullRequestWorktreeIds: ReadonlySet<string>
  now: number
}): WorkspaceAgentRuleTarget[] {
  const { state, repoIds, pullRequestWorktreeIds, now } = args
  const scopedRepoIds = new Set(repoIds)
  const agentsByWorktreeId = collectAgentsByWorktreeId(state, now)
  return getIndexedAllWorktrees(state.worktreesByRepo).flatMap((worktree) => {
    if (
      !scopedRepoIds.has(worktree.repoId) ||
      worktree.isArchived ||
      worktree.isBare ||
      worktree.isMainWorktree
    ) {
      return []
    }
    const agents = agentsByWorktreeId.get(worktree.id)
    if (!agents) {
      return []
    }
    return [
      {
        worktreeId: worktree.id,
        executionHostId: worktree.hostId ?? 'local',
        currentStatus: worktree.workspaceStatus ?? null,
        hasLinkedPullRequest: pullRequestWorktreeIds.has(worktree.id),
        manualOverride: worktree.agentRuleManualOverride ?? null,
        snapshot: { worktreeId: worktree.id, agents }
      }
    ]
  })
}
